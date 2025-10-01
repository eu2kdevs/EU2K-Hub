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
      theme: ThemeData.dark(),
      debugShowCheckedModeBanner: false,
      home: Scaffold(
        backgroundColor: const Color(0xFF272B26), // #272B26 background
        body: Center(
          child: SizedBox.square(
            dimension: 160,
            child: LoadingIndicator.contained(),
          ),
        ),
      ),
    );
  }
}
