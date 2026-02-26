---
"@neaps/tide-predictor": patch
---

Align timeline predictions to clock boundaries based on `timeFidelity`. For example, with the default timeFidelity of 600 seconds, predictions now fall on :00, :10, :20, :30, :40, :50 past the hour regardless of the requested start time. The start time will always snap to the previous clock boundary, and the end time will snap to the next clock boundary.
