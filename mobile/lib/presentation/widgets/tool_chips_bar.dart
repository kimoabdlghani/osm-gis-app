// mobile/lib/presentation/widgets/tool_chips_bar.dart
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../domain/models/gis_feature.dart';
import '../controllers/gis_controller.dart';

/// Floating Tool Action Chips (Google Maps Action Pills)
class ToolChipsBar extends StatelessWidget {
  final GisController controller;

  const ToolChipsBar({super.key, required this.controller});

  Widget _buildChip({
    required String label,
    required IconData icon,
    required bool isActive,
    required VoidCallback onTap,
    Color? activeColor,
    Color? iconColor,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isActive ? (activeColor ?? AppTheme.primary) : AppTheme.cardGlass,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isActive ? AppTheme.primaryLight : AppTheme.borderLight,
            width: 1.2,
          ),
          boxShadow: [
            if (isActive)
              BoxShadow(
                color: (activeColor ?? AppTheme.primary).withOpacity(0.4),
                blurRadius: 10,
              ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 16,
              color: isActive ? Colors.white : (iconColor ?? AppTheme.textLight),
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: isActive ? Colors.white : AppTheme.textLight,
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 40,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        children: [
          _buildChip(
            label: 'Marker',
            icon: Icons.location_pin,
            isActive: controller.mode == DrawingMode.point,
            onTap: () => controller.setMode(DrawingMode.point),
          ),
          _buildChip(
            label: 'Distance',
            icon: Icons.straighten,
            isActive: controller.mode == DrawingMode.line,
            onTap: () => controller.setMode(DrawingMode.line),
          ),
          _buildChip(
            label: 'Area',
            icon: Icons.square_foot,
            isActive: controller.mode == DrawingMode.polygon,
            onTap: () => controller.setMode(DrawingMode.polygon),
          ),
          _buildChip(
            label: 'Undo',
            icon: Icons.undo,
            isActive: false,
            onTap: () {
              final undone = controller.undoLastPoint();
              if (!undone) {
                controller.undoLastShape();
              }
            },
          ),
          _buildChip(
            label: 'Clear All',
            icon: Icons.delete_outline,
            isActive: false,
            activeColor: AppTheme.danger,
            iconColor: AppTheme.danger,
            onTap: () {
              showDialog(
                context: context,
                builder: (ctx) => AlertDialog(
                  backgroundColor: AppTheme.cardSurface,
                  title: const Text('Clear all shapes?'),
                  content: const Text('This will remove all created markers and shapes.'),
                  actions: [
                    TextButton(
                      child: const Text('Cancel'),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                    TextButton(
                      child: const Text('Clear', style: TextStyle(color: AppTheme.danger)),
                      onPressed: () {
                        controller.clearAll();
                        Navigator.pop(ctx);
                      },
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
