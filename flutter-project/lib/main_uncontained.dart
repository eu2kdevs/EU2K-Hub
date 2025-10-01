import 'package:flutter/material.dart';
import 'package:material_loading_indicator/loading_indicator.dart';

void main() {
  runApp(const UncontainedApp());
}

class UncontainedApp extends StatelessWidget {
  const UncontainedApp({super.key});

  @override
  Widget build(BuildContext context) {
    final colorScheme = const ColorScheme.dark(
      primary: Color(0xFF9BD4A0),
      background: Color(0xFF101510),
    );

    return MaterialApp(
      theme: ThemeData(colorScheme: colorScheme, useMaterial3: true),
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        backgroundColor: Colors.transparent,
        body: LayoutBuilder(
          builder: (context, constraints) {
            final double shortest = constraints.biggest.shortestSide;
            final double rawSize = shortest.isFinite ? shortest * 0.4 : 160.0;
            final double size = rawSize.clamp(64.0, 240.0).toDouble();
            return Center(
              child: SizedBox(
                width: size,
                height: size,
                child: LoadingIndicatorTheme(
                  data: const LoadingIndicatorThemeData(
                    activeIndicatorColor: Color(0xFF9BD4A0),
                  ),
                  child: LoadingIndicator(),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
