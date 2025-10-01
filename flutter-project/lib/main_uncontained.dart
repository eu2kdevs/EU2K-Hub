import 'package:flutter/material.dart';
import 'package:material_loading_indicator/loading_indicator.dart';

void main() {
  runApp(const UncontainedApp());
}

class UncontainedApp extends StatelessWidget {
  const UncontainedApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      theme: ThemeData.dark(),
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        backgroundColor: Colors.transparent,
        body: Center(
          child: SizedBox.square(
            dimension: 160,
            child: LoadingIndicator(),
          ),
        ),
      ),
    );
  }
}
