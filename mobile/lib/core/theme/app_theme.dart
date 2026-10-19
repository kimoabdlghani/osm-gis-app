// mobile/lib/core/theme/app_theme.dart
import 'package:flutter/material.dart';

/// App Theme & Color Palette (Google Maps Dark Glassmorphism)
class AppTheme {
  static const Color background = Color(0xFF0F172A);
  static const Color cardSurface = Color(0xFF1E293B);
  static const Color cardGlass = Color(0xEA0F172A);
  static const Color borderLight = Color(0xFF334155);
  static const Color borderAccent = Color(0x4038BDF8);

  static const Color primary = Color(0xFF0284C7);
  static const Color primaryLight = Color(0xFF38BDF8);
  static const Color success = Color(0xFF10B981);
  static const Color danger = Color(0xFFEF4444);

  static const Color textLight = Color(0xFFF8FAFC);
  static const Color textMuted = Color(0xFF94A3B8);

  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: background,
      primaryColor: primary,
      colorScheme: const ColorScheme.dark(
        primary: primary,
        secondary: primaryLight,
        surface: cardSurface,
        error: danger,
      ),
      cardTheme: CardTheme(
        color: cardGlass,
        elevation: 8,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: borderLight, width: 1),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
      ),
    );
  }
}
