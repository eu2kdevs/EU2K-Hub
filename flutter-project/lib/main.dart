import 'package:flutter/material.dart';
import 'package:material_loading_indicator/loading_indicator.dart';

void main() {
  runApp(const App());
}

class App extends StatelessWidget {
  const App({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      theme: ThemeData(),
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        backgroundColor: Colors.transparent,
        body: Center(
          child: LayoutBuilder(
            builder: (context, constraints) {
              final shortest = constraints.biggest.shortestSide;
              final rawSize = shortest.isFinite ? shortest * 0.4 : 160.0;
              final size = rawSize.clamp(64.0, 240.0);
              return SizedBox(
                width: size,
                height: size,
                child: LoadingIndicator(),
              );
            },
          ),
        ),
      ),
    );
  }
}
