import React, { useEffect, useState } from "react";
import BleButtons from "../../partials/BleButtons/BleButtons";
import { getAllData } from "../../store/indexedDB";
import { useStore } from "../../store/store";
import Sidebar from "../../partials/Sidebar";
import Header from "../../partials/Header";

const BleDevices = () => {
  const { state, dispatch } = useStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    // Fetch existing data from IndexedDB (or any other setup you need)
    getAllData().then((data) => {
      if (data && data.length > 0) {
        dispatch({ type: "SET_BLE_DATA", payload: data });
      }
    });

    const connectWebViewJavascriptBridge = (callback) => {
      if (window.WebViewJavascriptBridge) {
        callback(window.WebViewJavascriptBridge);
      } else {
        document.addEventListener(
          "WebViewJavascriptBridgeReady",
          () => {
            callback(window.WebViewJavascriptBridge);
          },
          false
        );

        const timeout = setTimeout(() => {
          if (window.WebViewJavascriptBridge) {
            callback(window.WebViewJavascriptBridge);
            clearTimeout(timeout);
          } else {
            console.error(
              "WebViewJavascriptBridge is not initialized within the timeout period."
            );
          }
        }, 3000);
      }
    };

    const setupBridge = (bridge) => {
      if (!state.bridgeInitialized) {
        bridge.init((message, responseCallback) => {
          responseCallback("js success!");
        });

        bridge.registerHandler("print", (data, responseCallback) => {
          try {
            console.log("Raw data received from 'print':", data);
            const parsedData = JSON.parse(data);
            if (parsedData && parsedData.data) {
              dispatch({ type: "SET_BLE_DATA", payload: parsedData.data });
              responseCallback(parsedData.data);
            } else {
              throw new Error("Parsed data is not in the expected format.");
            }
          } catch (error) {
            console.error(
              "Error parsing JSON data from 'print' handler:",
              error
            );
          }
        });
        bridge.registerHandler(
          "findBleDeviceCallBack",
          (data, responseCallback) => {
            try {
              const parsedData = JSON.parse(data);
              if (
                parsedData &&
                parsedData.macAddress &&
                parsedData.name &&
                parsedData.rssi
              ) {
                // Ensure the required fields are present
                dispatch({ type: "ADD_DETECTED_DEVICE", payload: parsedData });
                responseCallback({ success: true });
              } else {
                console.warn("Invalid device data format:", parsedData);
              }
            } catch (error) {
              console.error("Error parsing BLE device data:", error);
              responseCallback({ success: false, error: error.message });
            }
          }
        );

        bridge.registerHandler(
          "bleConnectFailCallBack",
          (data, responseCallback) => {
            console.log("Bluetooth connection failed:", data);
            responseCallback(data);
          }
        );

        bridge.registerHandler(
          "bleInitDataCallBack",
          (data, responseCallback) => {
            try {
              const parsedData = JSON.parse(data);
              dispatch({ type: "SET_INIT_BLE_DATA", payload: parsedData });
              responseCallback(parsedData);
            } catch (error) {
              console.error(
                "Error parsing JSON data from 'bleInitDataCallBack' handler:",
                error
              );
            }
          }
        );

        // Registering MQTT handlers
        bridge.registerHandler(
          "mqttMessageReceived",
          (data, responseCallback) => {
            try {
              const parsedMessage = JSON.parse(data);
              dispatch({ type: "SET_MQTT_MESSAGE", payload: parsedMessage }); // Dispatch the MQTT message
              responseCallback(parsedMessage);
            } catch (error) {
              console.error("Error parsing MQTT message:", error);
            }
          }
        );

        bridge.registerHandler(
          "connectMqttCallBack",
          function (data, responseCallback) {
            const parsedMessage = JSON.parse(data);
            console.info("MQTT Connection Callback:", parsedMessage);
            responseCallback("Received MQTT Connection Callback");
          }
        );

        bridge.registerHandler(
          "mqttMsgArrivedCallBack",
          function (data, responseCallback) {
            console.info("MQTT Message Arrived Callback:", data);
            responseCallback("Received MQTT Message");
          }
        );

        dispatch({ type: "SET_BRIDGE_INITIALIZED", payload: true });
        console.log("WebViewJavascriptBridge initialized.");
      }
    };

    connectWebViewJavascriptBridge(setupBridge);
    // Automatically start BLE scan when component mounts
    startBleScan();

    // Clean up: stop the scan if the component is unmounted
    return () => stopBleScan();
  }, [state.bridgeInitialized, dispatch]);

  const startBleScan = () => {
    if (window.WebViewJavascriptBridge) {
      window.WebViewJavascriptBridge.callHandler(
        "startBleScan",
        "",
        (responseData) => {
          try {
            const jsonData = JSON.parse(responseData);
            dispatch({ type: "SET_BLE_DATA", payload: jsonData });
            console.log("BLE Data:", jsonData);
          } catch (error) {
            console.error(
              "Error parsing JSON data from 'startBleScan' response:",
              error
            );
          }
        }
      );
      dispatch({ type: "SET_IS_SCANNING", payload: true });
    } else {
      console.error("WebViewJavascriptBridge is not initialized.");
    }
  };

  const stopBleScan = () => {
    if (window.WebViewJavascriptBridge && state.isScanning) {
      window.WebViewJavascriptBridge.callHandler("stopBleScan", "", () => {
        console.log("Scanning stopped");
      });
      dispatch({ type: "SET_IS_SCANNING", payload: false });
    } else {
      console.error(
        "WebViewJavascriptBridge is not initialized or scanning is not active."
      );
    }
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Content area */}
      <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        {/*  Site header */}
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        
        <main className="grow">
          <BleButtons />
        </main>
      </div>
    </div>
    // {/* <div className="grid overflow-hidden grid-rows-[1fr_auto] max-h-screen min-w-screen dark:text-gray-300 dark:bg-gray-800">

    // </div> */}
  );
};

export default BleDevices;
