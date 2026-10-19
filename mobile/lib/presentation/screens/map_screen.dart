// mobile/lib/presentation/screens/map_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';

import '../../core/constants/map_config.dart';
import '../../core/theme/app_theme.dart';
import '../../domain/models/gis_feature.dart';
import '../controllers/gis_controller.dart';
import '../widgets/floating_search_bar.dart';
import '../widgets/tool_chips_bar.dart';
import '../widgets/layer_switcher_badge.dart';
import '../widgets/drawing_action_pill.dart';

/// Main Fullscreen GIS Map Screen
/// Direct GPU rendering via FlutterMap (60-120 FPS)
class MapScreen extends StatefulWidget {
  final GisController controller;

  const MapScreen({super.key, required this.controller});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final MapController _mapController = MapController();
  LatLng? _userLocation;

  @override
  void initState() {
    super.initState();
    widget.controller.loadInitialShapes();
  }

  /// Request user GPS position
  Future<void> _locateUser() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please enable GPS location service.')),
        );
      }
      return;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return;
    }

    final pos = await Geolocator.getCurrentPosition();
    final latLng = LatLng(pos.latitude, pos.longitude);

    setState(() => _userLocation = latLng);
    _mapController.move(latLng, 16.0);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: ListenableBuilder(
        listenable: widget.controller,
        builder: (context, _) {
          final activeLayer = MapConfig.layers[widget.controller.currentLayerId] ??
              MapConfig.layers.values.first;

          return Stack(
            children: [
              // 1. Fullscreen GPU Map Engine
              FlutterMap(
                mapController: _mapController,
                options: MapOptions(
                  initialCenter: MapConfig.defaultCenter,
                  initialZoom: MapConfig.defaultZoom,
                  minZoom: MapConfig.minZoom,
                  maxZoom: MapConfig.maxZoom,
                  onTap: (_, point) => widget.controller.handleMapTap(point),
                  onDoubleTap: (_, __) => widget.controller.cancelDrawing(),
                ),
                children: [
                  // Base Tile Layer
                  TileLayer(
                    urlTemplate: activeLayer.urlTemplate,
                    subdomains: activeLayer.subdomains,
                    userAgentPackageName: 'com.mapstudio.gis',
                    maxZoom: activeLayer.maxZoom,
                  ),

                  // Saved & In-Progress Polygons
                  PolygonLayer(
                    polygons: [
                      // Saved Polygons
                      ...widget.controller.features
                          .where((f) => f.type == 'Polygon' && f.points.length >= 3)
                          .map(
                            (f) => Polygon(
                              points: f.points,
                              color: const Color(0x5510B981),
                              borderColor: const Color(0xFF10B981),
                              borderStrokeWidth: 3,
                            ),
                          ),
                      // Active Drawing Polygon
                      if (widget.controller.mode == DrawingMode.polygon &&
                          widget.controller.tempPoints.length >= 3)
                        Polygon(
                          points: widget.controller.tempPoints,
                          color: const Color(0x4438BDF8),
                          borderColor: const Color(0xFF38BDF8),
                          borderStrokeWidth: 2,
                        ),
                    ],
                  ),

                  // Saved & In-Progress Polylines
                  PolylineLayer(
                    polylines: [
                      // Saved Lines
                      ...widget.controller.features
                          .where((f) => f.type == 'Line' && f.points.length >= 2)
                          .map(
                            (f) => Polyline(
                              points: f.points,
                              color: const Color(0xFF0284C7),
                              strokeWidth: 4,
                            ),
                          ),
                      // Active Drawing Line
                      if (widget.controller.mode == DrawingMode.line &&
                          widget.controller.tempPoints.isNotEmpty)
                        Polyline(
                          points: widget.controller.tempPoints,
                          color: const Color(0xFF38BDF8),
                          strokeWidth: 3,
                        ),
                    ],
                  ),

                  // Markers Layer
                  MarkerLayer(
                    markers: [
                      // Saved Point Markers
                      ...widget.controller.features
                          .where((f) => f.type == 'Point' && f.points.isNotEmpty)
                          .map(
                            (f) => Marker(
                              point: f.points.first,
                              width: 36,
                              height: 36,
                              child: const Icon(
                                Icons.location_on,
                                color: Color(0xFFEF4444),
                                size: 36,
                              ),
                            ),
                          ),
                      // Active Drawing Points
                      ...widget.controller.tempPoints.map(
                        (p) => Marker(
                          point: p,
                          width: 14,
                          height: 14,
                          child: Container(
                            decoration: BoxDecoration(
                              color: AppTheme.primaryLight,
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white, width: 2),
                            ),
                          ),
                        ),
                      ),
                      // Current GPS Location Marker
                      if (_userLocation != null)
                        Marker(
                          point: _userLocation!,
                          width: 22,
                          height: 22,
                          child: Container(
                            decoration: BoxDecoration(
                              color: const Color(0xFF0284C7),
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white, width: 3),
                              boxShadow: const [
                                BoxShadow(color: Color(0x880284C7), blurRadius: 10),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ),

              // 2. Floating Top Controls
              SafeArea(
                child: Column(
                  children: [
                    const SizedBox(height: 8),
                    FloatingSearchBar(
                      repository: widget.controller.repository,
                      onLocationSelected: (loc) => _mapController.move(loc, 15.0),
                      onLocateMe: _locateUser,
                    ),
                    const SizedBox(height: 10),
                    ToolChipsBar(controller: widget.controller),
                  ],
                ),
              ),

              // 3. Floating Bottom-Left Layers Switcher
              Positioned(
                bottom: 30,
                left: 16,
                child: LayerSwitcherBadge(controller: widget.controller),
              ),

              // 4. Floating Drawing Action Pill
              Positioned(
                bottom: 84,
                left: 0,
                right: 0,
                child: Center(
                  child: DrawingActionPill(controller: widget.controller),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
