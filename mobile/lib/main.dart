// mobile/lib/main.dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'core/theme/app_theme.dart';
import 'data/repositories/shapes_repository.dart';
import 'presentation/controllers/gis_controller.dart';
import 'presentation/screens/map_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // Edge-to-edge transparent system bars
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: Colors.transparent,
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  final repository = ShapesRepository();
  final controller = GisController(repository: repository);

  runApp(MapStudioGisApp(controller: controller));
}

class MapStudioGisApp extends StatelessWidget {
  final GisController controller;

  const MapStudioGisApp({super.key, required this.controller});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Map Studio GIS',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: MapScreen(controller: controller),
    );
  }
}
