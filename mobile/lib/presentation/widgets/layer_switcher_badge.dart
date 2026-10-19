// mobile/lib/presentation/widgets/layer_switcher_badge.dart
import 'package:flutter/material.dart';
import '../../core/constants/map_config.dart';
import '../../core/theme/app_theme.dart';
import '../controllers/gis_controller.dart';

/// Bottom-Left Floating Layers Widget (Google Maps Style)
class LayerSwitcherBadge extends StatelessWidget {
  final GisController controller;

  const LayerSwitcherBadge({super.key, required this.controller});

  void _showLayersSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppTheme.cardGlass,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Map Types & Layers',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textLight,
                ),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: MapConfig.layers.entries.map((entry) {
                  final key = entry.key;
                  final def = entry.value;
                  final isSelected = controller.currentLayerId == key;

                  return GestureDetector(
                    onTap: () {
                      controller.switchBaseLayer(key);
                      Navigator.pop(ctx);
                    },
                    child: Column(
                      children: [
                        Container(
                          width: 60,
                          height: 60,
                          decoration: BoxDecoration(
                            color: isSelected ? AppTheme.primary : AppTheme.cardSurface,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: isSelected ? AppTheme.primaryLight : AppTheme.borderLight,
                              width: isSelected ? 2 : 1,
                            ),
                          ),
                          child: Icon(
                            key == 'satellite'
                                ? Icons.satellite_alt
                                : key == 'dark'
                                    ? Icons.dark_mode
                                    : key == 'topo'
                                        ? Icons.terrain
                                        : Icons.map,
                            color: isSelected ? Colors.white : AppTheme.textMuted,
                            size: 28,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          def.label.split(' ').first,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                            color: isSelected ? AppTheme.primaryLight : AppTheme.textLight,
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => _showLayersSheet(context),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: AppTheme.cardGlass,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppTheme.borderLight),
          boxShadow: const [
            BoxShadow(color: Colors.black45, blurRadius: 10),
          ],
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.layers_outlined, size: 18, color: AppTheme.primaryLight),
            SizedBox(width: 6),
            Text(
              'Layers',
              style: TextStyle(
                color: AppTheme.textLight,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
