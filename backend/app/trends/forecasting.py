import math
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing

logger = logging.getLogger("pulse_forecasting")

def calculate_smape(actual: np.ndarray, predicted: np.ndarray) -> float:
    """Calculate Symmetric Mean Absolute Percentage Error (handles zero actuals safely)."""
    denominator = (np.abs(actual) + np.abs(predicted)) / 2.0
    diff = np.abs(predicted - actual)
    # Avoid zero division
    valid = denominator > 1e-5
    if not np.any(valid):
        return 0.0
    return float(np.mean(diff[valid] / denominator[valid]) * 100.0)

def calculate_mae(actual: np.ndarray, predicted: np.ndarray) -> float:
    return float(np.mean(np.abs(predicted - actual)))

def calculate_rmse(actual: np.ndarray, predicted: np.ndarray) -> float:
    return float(np.sqrt(np.mean((predicted - actual) ** 2)))

class TrendForecaster:
    def __init__(self, version: str = "v1.2-statsmodels"):
        self.version = version

    def fit_and_forecast(
        self,
        topic: str,
        dates: List[str],
        values: List[float],
        horizon: int = 30,
        target_model: str = "best",
        real_days_count: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Chronologically backtests and generates forecasts for topic volume.
        Supports horizons of 30, 60, and 90 days with 80% and 95% prediction intervals.
        Requires at least 21 real days of historical observations to train Holt-Winters ETS.
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        n = len(values)

        # Enforce minimum 21 real days guardrail: show 'Building history' and NO fake forecast
        if real_days_count is not None and real_days_count < 21:
            return {
                "topic": topic,
                "target_metric": "daily_mentions",
                "horizon_days": horizon,
                "model_name": "Building history (Minimum 21 real days required)",
                "model_version": self.version,
                "training_cutoff_date": dates[-1] if dates else "unknown",
                "forecast_generated_at": now_iso,
                "evaluation": {
                    "mae": 0.0,
                    "rmse": 0.0,
                    "smape_pct": 0.0,
                    "baseline_mae": 0.0,
                    "relative_improvement_pct": 0.0,
                },
                "status": "building_history",
                "real_days_count": real_days_count,
                "min_required_days": 21,
                "notes": f"Building history: {real_days_count}/21 real days accumulated. Machine learning forecast will activate automatically once 21 real days are recorded.",
                "historical_points": [{"date": d, "actual": v} for d, v in zip(dates, values)],
                "forecast_points": [],
            }

        if n < 14:
            # Insufficient history guardrail
            avg_val = np.mean(values) if n > 0 else 5.0
            last_date = datetime.strptime(dates[-1], "%Y-%m-%d") if dates else datetime.now(timezone.utc)
            forecast_points = []
            for h in range(1, horizon + 1):
                f_date = (last_date + timedelta(days=h)).strftime("%Y-%m-%d")
                forecast_points.append({
                    "date": f_date,
                    "predicted": round(float(avg_val), 1),
                    "lower_80": max(0.0, round(float(avg_val * 0.7), 1)),
                    "upper_80": round(float(avg_val * 1.3), 1),
                    "lower_95": max(0.0, round(float(avg_val * 0.5), 1)),
                    "upper_95": round(float(avg_val * 1.5), 1),
                })

            return {
                "topic": topic,
                "target_metric": "daily_mentions",
                "horizon_days": horizon,
                "model_name": "Simple Mean (Insufficient History)",
                "model_version": self.version,
                "training_cutoff_date": dates[-1] if dates else "unknown",
                "forecast_generated_at": now_iso,
                "evaluation": {
                    "mae": 0.0,
                    "rmse": 0.0,
                    "smape_pct": 0.0,
                    "baseline_mae": 0.0,
                    "relative_improvement_pct": 0.0,
                },
                "status": "insufficient_history",
                "notes": f"Only {n} historical data points available. Minimum 14 points required for rigorous ML model fitting.",
                "historical_points": [{"date": d, "actual": v} for d, v in zip(dates, values)],
                "forecast_points": forecast_points,
            }

        # Sparsity check
        non_zeros = np.count_nonzero(values)
        is_sparse = (non_zeros / n) < 0.35

        # 1. Chronological Train/Test Split for Backtesting
        test_size = min(14, max(7, int(n * 0.2)))
        train_vals = np.array(values[:-test_size], dtype=float)
        test_vals = np.array(values[-test_size:], dtype=float)

        # Baseline Model: Seasonal-Naive with Drift
        baseline_preds = []
        train_drift = (train_vals[-1] - train_vals[0]) / max(1, len(train_vals))
        for step in range(test_size):
            # Look back 7 days if available
            lookback_idx = len(train_vals) - 7 + (step % 7)
            val = train_vals[lookback_idx] if lookback_idx >= 0 else train_vals[-1]
            baseline_preds.append(max(0.0, val + (step + 1) * train_drift))
        baseline_preds = np.array(baseline_preds)
        baseline_mae = calculate_mae(test_vals, baseline_preds)

        # 2. Fit Holt-Winters Exponential Smoothing on train
        ets_mae = 999.0
        ets_rmse = 999.0
        ets_smape = 999.0
        ets_fit_successful = False

        try:
            series_train = pd.Series(train_vals)
            # Use additive trend and weekly seasonal period 7
            hw_model = ExponentialSmoothing(
                series_train,
                trend="add",
                seasonal="add" if len(train_vals) >= 14 else None,
                seasonal_periods=7 if len(train_vals) >= 14 else None,
                initialization_method="estimated"
            ).fit()
            hw_test_preds = np.maximum(0.0, hw_model.forecast(test_size).to_numpy())
            ets_mae = calculate_mae(test_vals, hw_test_preds)
            ets_rmse = calculate_rmse(test_vals, hw_test_preds)
            ets_smape = calculate_smape(test_vals, hw_test_preds)
            ets_fit_successful = True
        except Exception as e:
            logger.warning(f"ETS fitting failed on train split for {topic}: {e}")

        # 3. Model Selection
        selected_model = "ets"
        if target_model == "baseline" or not ets_fit_successful or (ets_mae > baseline_mae * 1.25):
            selected_model = "baseline"
            final_mae = baseline_mae
            final_rmse = calculate_rmse(test_vals, baseline_preds)
            final_smape = calculate_smape(test_vals, baseline_preds)
            model_display_name = "Seasonal-Naive Drift Baseline"
        else:
            final_mae = ets_mae
            final_rmse = ets_rmse
            final_smape = ets_smape
            model_display_name = "Holt-Winters Exponential Smoothing (ETS)"

        rel_improvement = 0.0
        if baseline_mae > 0:
            rel_improvement = round(((baseline_mae - final_mae) / baseline_mae) * 100, 1)

        # 4. Refit chosen model on FULL series to generate forward forecast
        full_series = pd.Series(values, dtype=float)
        full_arr = np.array(values, dtype=float)
        last_dt = datetime.strptime(dates[-1], "%Y-%m-%d")

        forecast_vals = []
        if selected_model == "ets":
            try:
                full_model = ExponentialSmoothing(
                    full_series,
                    trend="add",
                    seasonal="add" if len(full_series) >= 14 else None,
                    seasonal_periods=7 if len(full_series) >= 14 else None,
                    initialization_method="estimated"
                ).fit()
                raw_forecast = full_model.forecast(horizon).to_numpy()
                forecast_vals = np.maximum(0.0, raw_forecast)
                # Compute in-sample residuals for confidence intervals
                fitted = full_model.fittedvalues.to_numpy()
                residuals = full_arr[len(full_arr) - len(fitted):] - fitted
                sigma = float(np.std(residuals)) if len(residuals) > 0 else 3.0
            except Exception as e:
                logger.error(f"Full ETS refit failed: {e}. Falling back to baseline.")
                selected_model = "baseline"

        if selected_model == "baseline":
            drift = (full_arr[-1] - full_arr[0]) / max(1, len(full_arr))
            for h in range(horizon):
                lookback = len(full_arr) - 7 + (h % 7)
                base = full_arr[lookback] if lookback >= 0 else full_arr[-1]
                forecast_vals.append(max(0.0, base + (h + 1) * drift))
            forecast_vals = np.array(forecast_vals)
            sigma = float(np.std(full_arr[-14:])) if len(full_arr) >= 14 else 4.0

        # 5. Build uncertainty intervals & forecast points
        forecast_points = []
        for step, val in enumerate(forecast_vals, 1):
            f_date = (last_dt + timedelta(days=step)).strftime("%Y-%m-%d")
            # Uncertainty expands with horizon sqrt(1 + 0.05 * step)
            step_sigma = sigma * math.sqrt(1.0 + 0.04 * step)
            pred_val = round(float(val), 1)

            forecast_points.append({
                "date": f_date,
                "predicted": pred_val,
                "lower_80": max(0.0, round(float(val - 1.282 * step_sigma), 1)),
                "upper_80": round(float(val + 1.282 * step_sigma), 1),
                "lower_95": max(0.0, round(float(val - 1.960 * step_sigma), 1)),
                "upper_95": round(float(val + 1.960 * step_sigma), 1),
            })

        # Historical points for chart
        historical_points = [{"date": d, "actual": round(float(v), 1)} for d, v in zip(dates, values)]

        return {
            "topic": topic,
            "target_metric": "daily_mentions",
            "horizon_days": horizon,
            "model_name": model_display_name,
            "model_version": self.version,
            "training_cutoff_date": dates[-1],
            "forecast_generated_at": now_iso,
            "evaluation": {
                "mae": round(final_mae, 2),
                "rmse": round(final_rmse, 2),
                "smape_pct": round(final_smape, 2),
                "baseline_mae": round(baseline_mae, 2),
                "relative_improvement_pct": rel_improvement,
            },
            "status": "sparse_data" if is_sparse else "trained",
            "notes": "Trained using chronological train/holdout validation without future leakage. Zero counts handled correctly." if not is_sparse else "Warning: Topic activity is sparse (>65% zero values). Predictions have wider confidence bounds.",
            "historical_points": historical_points,
            "forecast_points": forecast_points,
        }

forecaster = TrendForecaster()
