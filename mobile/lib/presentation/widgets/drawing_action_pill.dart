// mobile/lib/presentation/widgets/drawing_action_pill.dart
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../domain/models/gis_feature.dart';
import '../controllers/gis_controller.dart';

/// Floating Drawing Action Pill (Finish / Cancel)
class DrawingActionPill extends StatelessWidget {
  final GisController controller;

  const DrawingActionPill({super.key, required this.controller});

  @override
  Widget build(BuildContext context) {
    if (controller.mode == DrawingMode.none || controller.mode == DrawingMode.point) {
      return const SizedBox.shrink();
    }

    final hasEnoughPoints = (controller.mode == DrawingMode.line && controller.tempPoints.length >= 2) ||
        (controller.mode == DrawingMode.polygon && controller.tempPoints.length >= 3);

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: AppTheme.cardGlass,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppTheme.primaryLight, width: 1.2),
        boxShadow: const [
          BoxShadow(color: Colors.black54, blurRadius: 16),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Expanded(
            child: Text(
              controller.liveMetricText.isNotEmpty
                  ? controller.liveMetricText
                  : 'Tap points on the map',
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppTheme.textLight,
              ),
            ),
          ),
          const SizedBox(width: 8),
          if (hasEnoughPoints)
            ElevatedButton(
              onPressed: () => controller.finishCurrentShape(),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.success,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                minimumSize: Size.zero,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: const Text('Finish', style: TextStyle(fontSize: 12, color: Colors.white)),
            ),
          const SizedBox(width: 6),
          IconButton(
            icon: const Icon(Icons.close, size: 20, color: AppTheme.danger),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
            tooltip: 'Cancel',
            onPressed: () => controller.cancelDrawing(),
          ),
        ],
      ),
    );
  }
}
