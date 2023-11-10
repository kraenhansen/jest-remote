/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  useColorScheme,
  View,
} from "react-native";

import { Colors, Header } from "react-native/Libraries/NewAppScreen";

import { JestRemoteClient } from "jest-remote-client";

const client = new JestRemoteClient();

function App(): JSX.Element {
  const [status, setStatus] = useState("Waiting ...");

  useEffect(() => {
    function handleConnected() {
      setStatus("Connected");
    }
    function handleDisconnected() {
      setStatus("Disconnected");
    }
    function handleRunTests() {
      setStatus("Running tests");
    }
    function handleRunTestsCompleted() {
      setStatus("Completed running tests");
    }

    client.on("connected", handleConnected);
    client.on("disconnected", handleDisconnected);
    client.on("run-tests", handleRunTests);
    client.on("run-tests-completed", handleRunTestsCompleted);
    return () => {
      client.removeListener("connected", handleConnected);
      client.removeListener("disconnected", handleDisconnected);
      client.removeListener("run-tests", handleRunTests);
      client.removeListener("run-tests-completed", handleRunTestsCompleted);
    };
  }, [setStatus]);
  const isDarkMode = useColorScheme() === "dark";

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}
      >
        <Header />
        <View
          style={{
            backgroundColor: isDarkMode ? Colors.black : Colors.white,
          }}
        >
          <Text>Status: {status}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default App;
