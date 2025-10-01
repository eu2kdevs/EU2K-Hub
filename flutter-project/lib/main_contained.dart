import 'package:flutter/material.dart';
import 'package:material_loading_indicator/loading_indicator.dart';

void main() {
  runApp(const ContainedApp());
}

class ContainedApp extends StatelessWidget {
  const ContainedApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      theme: ThemeData(),
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        backgroundColor: Colors.transparent,
        body: LayoutBuilder(
          builder: (context, constraints) {
            final double shortest = constraints.biggest.shortestSide;
            final double rawSize = shortest.isFinite ? shortest * 0.4 : 160.0;
            final double size = rawSize.clamp(64.0, 240.0).toDouble();
            return Center(
              child: Transform.translate(
                offset: const Offset(0, -12),
                child: SizedBox(
                  width: size,
                  height: size,
                  child: LoadingIndicator.contained(),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
