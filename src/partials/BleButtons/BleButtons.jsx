import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useStore } from "../../store/store";
import { useLocation, useNavigate } from "react-router-dom";
import { Camera, Loader2, Wifi, WifiOff, ChevronDown } from "lucide-react";
import BleDataPage from "./BleDataPage";
import { Button } from "../../components/reusableCards/Buttons";
import { Input } from "../../components/reusableCards/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/reusableCards/select";
import PopupNotification from "../notification/PopUp";
import { ProgressBar } from "../../components/reusableCards/progresBar";
import Transition from "../../utils/Transition";

const BleButtons = () => {
  const { dispatch, state } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [connectingMacAddress, setConnectingMacAddress] = useState(null);
  const [connectionSuccessMac, setConnectionSuccessMac] = useState(null);
  const [initSuccessMac, setInitSuccessMac] = useState(null);
  const [loadingMap, setLoadingMap] = useState(new Map());
  const [error, setError] = useState(null);
  const [showBleDataPage, setShowBleDataPage] = useState(false); // Control rendering of BleDataPage
  const [isNavigating, setIsNavigating] = useState(false);
  const [isPopupVisible, setPopupVisible] = useState(false);
  const [matchFound, setMatchFound] = useState(null);
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [isQrScanConnection, setIsQrScanConnection] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);
  const [currentAutoConnectIndex, setCurrentAutoConnectIndex] = useState(0);
  const [showProgressBar, setShowProgressBar] = useState(false);
  const [progressStage, setProgressStage] = useState("");
  const [explicitNavigationTriggered, setExplicitNavigationTriggered] =
    useState(false);
  const requestCode = 999;
  const [deviceQueue, setDeviceQueue] = useState([]);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const trigger = useRef(null);
  const dropdown = useRef(null);

  // close on click outside
  useEffect(() => {
    const clickHandler = ({ target }) => {
      if (!dropdown.current) return;
      if (
        !dropdownOpen ||
        dropdown.current.contains(target) ||
        trigger.current.contains(target)
      )
        return;
      setDropdownOpen(false);
    };
    document.addEventListener("click", clickHandler);
    return () => document.removeEventListener("click", clickHandler);
  });

  // close if the esc key is pressed
  useEffect(() => {
    const keyHandler = ({ keyCode }) => {
      if (!dropdownOpen || keyCode !== 27) return;
      setDropdownOpen(false);
    };
    document.addEventListener("keydown", keyHandler);
    return () => document.removeEventListener("keydown", keyHandler);
  });

  const handleMatchResult = (found) => {
    setMatchFound(found);
    setPopupVisible(true);
  };

  const handleContinue = () => {
    setPopupVisible(false); // Close the popup
  };

  const isAnyDeviceLoading = () => {
    return Array.from(loadingMap.values()).some((isLoading) => isLoading);
  };

  // Create a Map to ensure uniqueness based on MAC Address
  const uniqueDevicesMap = new Map();
  state.detectedDevices.forEach((device) => {
    // Only add devices with names containing "OVES" (case insensitive)
    if (device.name?.toLowerCase().includes("oves")) {
      uniqueDevicesMap.set(device.macAddress, device);
    }
  });

  // Filter and sort devices based on the current filter
  const sortedAndFilteredDevices = useMemo(() => {
    if (!uniqueDevicesMap || uniqueDevicesMap.size === 0) return [];
    let devices = Array.from(uniqueDevicesMap.values());

    if (searchTerm) {
      devices = devices.filter((device) =>
        device.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (sortBy) {
      devices.sort((a, b) => {
        if (sortBy === "rssi") {
          return sortOrder === "desc" ? b.rssi - a.rssi : a.rssi - b.rssi;
        } else if (sortBy === "name") {
          return sortOrder === "desc"
            ? b.name?.localeCompare(a.name)
            : a.name?.localeCompare(b.name);
        }
        return 0;
      });
    }

    return devices;
  }, [uniqueDevicesMap, searchTerm, sortBy, sortOrder]);

  useEffect(() => {
    if (window.WebViewJavascriptBridge) {
      window.WebViewJavascriptBridge.registerHandler(
        "bleConnectSuccessCallBack",
        (data, responseCallback) => {
          const macAddress = data.macAddress;
          if (macAddress) {
            initBleData(macAddress);
          } else {
            console.error(
              "MAC Address not found in successful connection data:",
              data
            );
          }
          responseCallback(data);
        }
      );
      window.WebViewJavascriptBridge.registerHandler(
        "bleInitDataOnProgressCallBack",
        (data) => {
          try {
            const parsedData = JSON.parse(data);
            const progressPercentage = Math.round(
              (parsedData.progress / parsedData.total) * 100
            );
            setProgress(progressPercentage);
          } catch (error) {
            console.error("Progress callback error:", error);
          }
        }
      );

      window.WebViewJavascriptBridge.registerHandler(
        "bleInitDataOnCompleteCallBack",
        (data) => {
          try {
            const parsedData = JSON.parse(data);
            console.log("Data received in completion callback:", parsedData);

            // Update application state with the fetched data
            dispatch({
              type: "SET_INIT_BLE_DATA",
              payload: { dataList: parsedData.dataList },
            });

            // Trigger navigation after updating state
            performNavigation(parsedData.dataList);
          } catch (error) {
            console.error("Completion callback error:", error);
            setError("Failed to process BLE initialization data.");
          } finally {
            setProgress(100);
            setShowProgressBar(false);
          }
        }
      );
      // In the scan result handler, set progress bar when data is received
      window.WebViewJavascriptBridge.registerHandler(
        "scanQrcodeResultCallBack",
        (data) => {
          try {
            const parsedData = JSON.parse(data);
            const scannedValue = parsedData.respData?.value;
            const callbackRequestCode = parsedData.respData?.requestCode;

            if (callbackRequestCode === requestCode) {
              console.log("Scanned data received:", scannedValue);

              // Update progress with more detailed stages
              setProgressStage("Processing scanned data");
              setProgress(40);

              if (!scannedValue) {
                throw new Error("No scan value received");
              }

              dispatch({ type: "SET_SCANNED_DATA", payload: scannedValue });

              // Update progress before handling scan data
              setProgressStage("Preparing device connection");
              setProgress(60);

              handleScanData(scannedValue);

              // Continue with device queue initialization
              setProgressStage("Initializing device queue");
              setProgress(80);
              initiateDeviceQueue();
            } else {
              throw new Error(
                `Request code mismatch. Expected: ${requestCode}, Received: ${callbackRequestCode}`
              );
            }
          } catch (error) {
            console.error("Error processing scan callback data:", error);

            setProgressStage("Scan processing failed");
            setProgress(0);
            setShowProgressBar(false);

            alert(`Scan processing error: ${error.message}`);
          }
        }
      );
    }
  }, []);

  const performNavigation = (deviceData, isScanConnection = false) => {
    if (isNavigating) return; // Prevent multiple navigations

    console.log("Attempting navigation with data:", {
      deviceData,
      isScanConnection,
    });

    setIsNavigating(true);

    try {
      // For manual connection, always navigate
      if (!isScanConnection && deviceData) {
        console.log(
          "Manual connection - Navigating to /ble-data with data:",
          deviceData
        );
        navigate("/ble-data", {
          state: { deviceData },
          replace: true,
        });
        setExplicitNavigationTriggered(false);
        return;
      }

      // For scan connection, verify device match
      if (isScanConnection) {
        const matchFound = checkDeviceMatch();

        if (matchFound && deviceData) {
          console.log(
            "Scan connection - Match found. Navigating to /ble-data:",
            deviceData
          );
          navigate("/ble-data", {
            state: { deviceData },
            replace: true,
          });
          setExplicitNavigationTriggered(false);
        } else {
          console.log(
            "Scan connection - No match found. Navigation prevented."
          );
          // Optionally handle no match scenario
          handleMatchResult(false);
        }
      }

      // If no valid navigation occurred
      if (!deviceData) {
        throw new Error("Navigation attempted without valid data");
      }
    } catch (error) {
      console.error("Navigation error:", error);
      setError(`Failed to navigate: ${error.message}`);
      setIsNavigating(false);
    } finally {
      // Ensure navigation state is reset
      setIsNavigating(false);
    }
  };

  // Modify handleConnectAndInit to differentiate manual and QR scan connections
  const handleConnectAndInit = async (e, macAddress) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    setShowBleDataPage(false);
    setIsQrScanConnection(false);
    setExplicitNavigationTriggered(true); // Set the trigger for navigation

    // Show the progress bar when the connection starts
    setShowProgressBar(true);
    setProgress(0);

    setLoadingMap((prevMap) => new Map(prevMap.set(macAddress, true)));
    setConnectingMacAddress(macAddress);

    try {
      setProgress(10);
      await connectToBluetoothDevice(macAddress);
      await new Promise((resolve) => setTimeout(resolve, 10000));

      setProgress(50);
      const response = await initBleData(macAddress);
      setProgress(80);
      dispatch({ type: "SET_INIT_BLE_DATA", payload: response });
      setConnectionSuccessMac(macAddress);
      setInitSuccessMac(macAddress);
      setShowBleDataPage(true);
    } catch (error) {
      console.error("Connection/initialization error:", error);
      setError(error.message || "Failed to connect and initialize BLE data");
    } finally {
      // Reset progress bar and loading state after connection process finishes
      setTimeout(() => {
        setConnectingMacAddress(null);
        setLoadingMap((prevMap) => {
          const newMap = new Map(prevMap);
          newMap.delete(macAddress);
          return newMap;
        });
        setShowProgressBar(false);
        setProgress(0); // Reset progress
      }, 45000);
    }
  };

  const connectToBluetoothDevice = (macAddress) => {
    return new Promise((resolve, reject) => {
      if (!window.WebViewJavascriptBridge) {
        reject(new Error("WebViewJavascriptBridge not initialized"));
        return;
      }

      console.log("Attempting to connect to device:", macAddress);

      window.WebViewJavascriptBridge.callHandler(
        "connBleByMacAddress",
        macAddress,
        (responseData) => {
          try {
            console.log("Raw connection response:", responseData);
            const parsedData = JSON.parse(responseData);
            console.log("Parsed connection response:", parsedData);

            if (parsedData.respCode === "200") {
              resolve(parsedData);
            } else {
              reject(
                new Error(
                  `Connection failed: ${parsedData.respMsg || "Unknown error"}`
                )
              );
            }
          } catch (error) {
            console.error("Error parsing connection response:", error);
            reject(
              new Error(`Failed to parse connection response: ${error.message}`)
            );
          }
        }
      );
    });
  };

  const initBleData = (macAddress) => {
    return new Promise((resolve, reject) => {
      if (!window.WebViewJavascriptBridge) {
        reject(new Error("WebViewJavascriptBridge not initialized"));
        return;
      }

      console.log("Initializing BLE data for:", macAddress);

      window.WebViewJavascriptBridge.callHandler(
        "initBleData",
        macAddress,
        (responseData) => {
          try {
            console.log("Raw init response:", responseData);
            const parsedData = JSON.parse(responseData);
            console.log("Parsed init response:", parsedData);

            // if (!parsedData || !parsedData.dataList) {
            //   reject(new Error("Invalid initialization response format"));
            //   return;
            // }

            resolve(parsedData);
          } catch (error) {
            console.error("Error parsing init response:", error);
            reject(
              new Error(
                `Failed to parse initialization response: ${error.message}`
              )
            );
          }
        }
      );
    });
  };

  // Function to initiate the QR/barcode scan
  const startQrCodeScan = () => {
    console.log("startQrCodeScan called");

    // Immediately show progress bar
    setShowProgressBar(true);
    setProgressStage("Initiating QR Code Scan");
    setProgress(5);

    if (window.WebViewJavascriptBridge) {
      window.WebViewJavascriptBridge.callHandler(
        "startQrCodeScan",
        999,
        (responseData) => {
          console.log("QR Code Scan Response:", responseData);

          try {
            const parsedResponse = JSON.parse(responseData);

            // Update progress and stages more explicitly
            if (
              parsedResponse.respCode === "200" &&
              parsedResponse.respData === true
            ) {
              console.log("Scan started successfully");

              setProgressStage("Scan in progress");
              setProgress(20);

              setIsAutoConnecting(true);
              setCurrentAutoConnectIndex(0);
            } else {
              console.error("Failed to start scan:", parsedResponse.respDesc);

              // Update progress bar to show failure
              setProgressStage("Scan failed");
              setProgress(0);
              setShowProgressBar(false);

              alert("Failed to start scan. Please try again.");
            }
          } catch (error) {
            console.error("Error parsing scan response:", error);

            setProgressStage("Scan error");
            setProgress(0);
            setShowProgressBar(false);

            alert("An error occurred during scanning.");
          }
        }
      );
    } else {
      console.error("WebViewJavascriptBridge is not initialized.");

      setProgressStage("Bridge not initialized");
      setProgress(0);
      setShowProgressBar(false);

      alert("Communication bridge not ready. Please try again.");
    }
  };

  // Modify the handleScanData function
  const handleScanData = (scannedValue) => {
    if (scannedValue) {
      console.log("Scanned Value:", scannedValue);
      dispatch({ type: "SET_SCANNED_DATA", payload: scannedValue });

      // Update progress and stage
      setProgressStage("Processing scanned data");
      setProgress(30);

      initiateDeviceQueue(); // Start pairing process
    } else {
      console.error("Invalid scan data received.");
      setShowProgressBar(false);
      alert("Invalid scan data. Neither a barcode nor a QR code.");
    }
  };

  const connectToNextDevice = (queue) => {
    const currentQueue = queue || deviceQueue;

    // Set session start time if not already set
    if (!sessionStartTime) {
      setSessionStartTime(Date.now());
    }

    // Check for session timeout (increased to allow more time for data fetching)
    const EXTENDED_SESSION_TIMEOUT = 60000; // 60 seconds
    if (
      sessionStartTime &&
      Date.now() - sessionStartTime > EXTENDED_SESSION_TIMEOUT
    ) {
      console.log(
        "Extended session timeout reached. Stopping device connection attempts."
      );
      setShowProgressBar(false);
      setIsAutoConnecting(false);
      setCurrentAutoConnectIndex(0);
      setSessionStartTime(null);
      handleMatchResult(false);
      return;
    }

    const nextDeviceMac = currentQueue[0];
    console.log("Attempting to connect to device:", nextDeviceMac);

    setProgressStage(`Connecting to ${nextDeviceMac}`);
    setProgress(50);

    if (window.WebViewJavascriptBridge) {
      window.WebViewJavascriptBridge.callHandler(
        "connBleByMacAddress",
        nextDeviceMac,
        async (responseData) => {
          try {
            const parsedData = JSON.parse(responseData);

            if (parsedData.respCode === 200) {
              console.log(`Successfully connected to ${nextDeviceMac}`);

              setProgressStage("Initializing device data");
              setProgress(70);

              // Add a timeout for data initialization
              const initDataTimeout = new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error("Data initialization timeout")),
                  15000
                )
              );

              try {
                const initResponse = await Promise.race([
                  initBleData(nextDeviceMac),
                  initDataTimeout,
                ]);

                dispatch({
                  type: "SET_INIT_BLE_DATA",
                  payload: { dataList: initResponse.dataList },
                });

                const matchFound = checkDeviceMatch();

                if (matchFound) {
                  setProgress(100);
                  handleMatchResult(true);

                  // Reset session start time
                  setSessionStartTime(null);

                  // Explicitly navigate with the data
                  performNavigation(initResponse.dataList, true);
                  // navigate("/ble-data", {
                  //   state: { deviceData: initResponse.dataList },
                  //   replace: true,
                  // });
                } else {
                  console.log("No match found, trying next device");

                  const updatedQueue = currentQueue.slice(1);
                  setDeviceQueue(updatedQueue);
                  await new Promise((resolve) => setTimeout(resolve, 50000));
                  connectToNextDevice(updatedQueue);
                }
              } catch (initError) {
                console.error("Data initialization error:", initError);
                const updatedQueue = currentQueue.slice(1);
                setDeviceQueue(updatedQueue);
                await new Promise((resolve) => setTimeout(resolve, 50000));
                connectToNextDevice(updatedQueue);
              }
            } else {
              console.error(`Failed to connect to ${nextDeviceMac}`);
              const updatedQueue = currentQueue.slice(1);
              setDeviceQueue(updatedQueue);
              await new Promise((resolve) => setTimeout(resolve, 10000));
              connectToNextDevice(updatedQueue);
            }
          } catch (error) {
            console.error("Connection error:", error);
            const updatedQueue = currentQueue.slice(1);
            setDeviceQueue(updatedQueue);
            await new Promise((resolve) => setTimeout(resolve, 1000));
            connectToNextDevice(updatedQueue);
          }
        }
      );
    } else {
      console.error("WebViewJavascriptBridge not initialized");
      setShowProgressBar(false);
    }
  };

  // Modify initiateDeviceQueue to reset session start time
  const initiateDeviceQueue = () => {
    const detectedDevices = Array.from(uniqueDevicesMap.values());
    if (detectedDevices && detectedDevices.length > 0) {
      // Reset session start time when initiating queue
      setSessionStartTime(Date.now());

      const topDevices = detectedDevices
        .sort((a, b) => b.rssi - a.rssi)
        .slice(0, 5);

      // Update progress and stage
      setProgressStage(`Preparing to connect to ${topDevices.length} devices`);
      setProgress(40);

      // Create a queue of device MAC addresses
      const deviceMacQueue = topDevices.map((device) => device.macAddress);
      setDeviceQueue(deviceMacQueue);

      console.log("Top devices for connection: ", topDevices);

      // Start the connection process
      connectToNextDevice(deviceMacQueue);
    } else {
      console.warn("No BLE devices detected.");
      setShowProgressBar(false);
      alert("No devices found. Please try scanning again.");
    }
  };

  // Device matching function
  const checkDeviceMatch = () => {
    const { initBleData, scannedData } = state;

    if (!initBleData || !scannedData || !initBleData.dataList) return false;

    for (const item of initBleData.dataList) {
      if (item.characteristicList) {
        for (const characteristic of Object.values(item.characteristicList)) {
          const { valType, descriptors } = characteristic;

          // More flexible matching
          const matchConditions = [
            valType &&
              valType
                .toString()
                .toLowerCase()
                .includes(scannedData.toLowerCase()),
            descriptors &&
              descriptors.toLowerCase().includes(scannedData.toLowerCase()),
          ];

          if (matchConditions.some((condition) => condition)) {
            console.log("Match found:", characteristic);
            return true;
          }
        }
      }
    }
    console.log("No match found for the current device.");
    return false;
  };

  // Automatic connection logic
  const autoConnectNextDevice = useCallback(async () => {
    const devices = sortedAndFilteredDevices;

    if (currentAutoConnectIndex >= devices.length) {
      setShowProgressBar(false);
      setIsAutoConnecting(false);
      setCurrentAutoConnectIndex(0);
      // Instead of a simple alert, use a more user-friendly popup
      handleMatchResult(false);
      return;
    }

    const deviceToConnect = devices[currentAutoConnectIndex];
    console.log("Attempting to auto-connect to:", deviceToConnect.macAddress);

    setShowProgressBar(true);
    setProgressStage(
      `Connecting to device ${deviceToConnect.name || "Unknown"}`
    );

    try {
      await connectToBluetoothDevice(deviceToConnect.macAddress);
      setProgress(60);

      await initBleData(deviceToConnect.macAddress);
      setProgress(80);

      const matchFound = checkDeviceMatch();
      if (matchFound) {
        setProgress(100);
        // Use handleMatchResult to show a success popup before navigation
        handleMatchResult(true);

        // Optional: Add a slight delay to allow user to see the match found popup
        setTimeout(() => {
          performNavigation(state.initResponse.dataList, true); // Add true for scan connection
          setIsAutoConnecting(false);
        }, 1500); // 1.5 seconds delay
      } else {
        console.log("No match found. Trying next device...");
        setCurrentAutoConnectIndex((prev) => prev + 1);
        setProgress(0); // Reset progress for the next device
        autoConnectNextDevice(); // Recursively try the next device
      }
    } catch (error) {
      console.error("Error during auto-connect:", error);
      setCurrentAutoConnectIndex((prev) => prev + 1);
      autoConnectNextDevice();
    }
  }, [sortedAndFilteredDevices, currentAutoConnectIndex, state.scannedData]);

  return (
    <div className="scan-data-page flex flex-col h-screen dark:text-gray-300 dark:bg-gray-800 grow px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      {/* Background with BleDataPage when loading */}
      <div
        className={`absolute inset-0 z-10 opacity-75 ${
          isAnyDeviceLoading() ? "block" : "hidden"
        }`}
      >
        <BleDataPage />
      </div>

      {/* Device List */}
      <div
        className={`${
          isAnyDeviceLoading() ? "hidden" : "block"
        } px-0 w-full max-w-9xl mx-auto`}
      >
        {error && (
          <div className="p-4 mb-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        <div className="relative overflow-hidden px-2 sm:px-6 lg:px-4 py-2 w-full max-w-9xl mx-auto">
          <div className="sm:flex sm:justify-between sm:items-center mb-5">
            {/* Left: Title */}
            <div className="mb-4 sm:mb-0">
              <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">
                BLE Devices
              </h1>
            </div>

            {/* Right: Actions */}
            <div className="grid grid-flow-col sm:auto-cols-max justify-start sm:justify-end gap-2">
              {/* Datepicker built with flatpickr */}
              <form className="relative">
                <label htmlFor="action-search" className="sr-only">
                  Search
                </label>
                <input
                  id="action-search"
                  className="form-input pl-9 bg-white dark:bg-gray-800"
                  type="search"
                  value={searchTerm}
                  placeholder="Search devices..."
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button
                  className="absolute inset-0 right-auto group"
                  type="submit"
                  aria-label="Search"
                >
                  <svg
                    className="shrink-0 fill-current text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400 ml-3 mr-2"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M7 14c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zM7 2C4.243 2 2 4.243 2 7s2.243 5 5 5 5-2.243 5-5-2.243-5-5-5z" />
                    <path d="M15.707 14.293L13.314 11.9a8.019 8.019 0 01-1.414 1.414l2.393 2.393a.997.997 0 001.414 0 .999.999 0 000-1.414z" />
                  </svg>
                </button>
              </form>
              <div className="relative inline-flex">
                <button
                  ref={trigger}
                  className="btn px-2.5 bg-white dark:bg-gray-800 border-gray-200 hover:border-gray-300 dark:border-gray-700/60 dark:hover:border-gray-600 text-gray-400 dark:text-gray-500"
                  aria-haspopup="true"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  aria-expanded={dropdownOpen}
                >
                  <span className="sr-only">Filter</span>
                  <wbr />
                  <svg
                    className="fill-current"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                  >
                    <path d="M0 3a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H1a1 1 0 0 1-1-1ZM3 8a1 1 0 0 1 1-1h8a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1ZM7 12a1 1 0 1 0 0 2h2a1 1 0 1 0 0-2H7Z" />
                  </svg>
                </button>
                <Transition
                  show={dropdownOpen}
                  tag="div"
                  className={`origin-top-right z-10 absolute top-full left-0 right-auto min-w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 pt-1.5 rounded-lg shadow-lg overflow-hidden mt-1 ${
                    "right"
                      ? "md:left-auto md:right-0"
                      : "md:left-0 md:right-auto"
                  }`}
                  enter="transition ease-out duration-200 transform"
                  enterStart="opacity-0 -translate-y-2"
                  enterEnd="opacity-100 translate-y-0"
                  leave="transition ease-out duration-200"
                  leaveStart="opacity-100"
                  leaveEnd="opacity-0"
                >
                  <div ref={dropdown}>
                    <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase pt-1.5 pb-2 px-3">
                      Filters
                    </div>
                    <ul className="mb-4">
                      <li className="py-1 px-3">
                        <label className="flex items-center">
                          <input type="checkbox" className="form-checkbox" />
                          <span className="text-sm font-medium ml-2">
                            Device Name
                          </span>
                        </label>
                      </li>
                      <li className="py-1 px-3">
                        <label className="flex items-center">
                          <input type="checkbox" className="form-checkbox" />
                          <span className="text-sm font-medium ml-2">
                            Signal Strength
                          </span>
                        </label>
                      </li>
                    </ul>
                    <div className="py-2 px-3 border-t border-gray-200 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-700/20">
                      <ul className="flex items-center justify-between">
                        <li>
                          <button className="btn-xs bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-red-500">
                            Clear
                          </button>
                        </li>
                        <li>
                          <button
                            className="btn-xs bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
                            onClick={() => setDropdownOpen(false)}
                            onBlur={() => setDropdownOpen(false)}
                            value={sortBy}
                            onValueChange={(value) => setSortBy(value)}
                          >
                            Apply
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>
                </Transition>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="text-gray-600 border-gray-300 bg-white dark:bg-gray-800"
                onClick={startQrCodeScan}
                aria-label="Scan QR Code"
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="w-full max-w-9xl xs:max-w-9xl sm:max-w-9xl md:max-w-9xl relative h-screen xs:max-h-screen sm:max-h-screen md:max-h-screen lg:max-h-screen">
            {sortedAndFilteredDevices.length > 0 ? (
              <ul className="text-left">
                {sortedAndFilteredDevices.map((device) => (
                  <li
                    key={device.macAddress}
                    className="p-2 w-full max-w-9xl xs:max-w-9xl sm:max-w-9xl md:max-w-9xl border rounded-md shadow flex items-center justify-between"
                  >
                    <div>
                      <p className="text-gray-700 font-bold">
                        {device.name || "Unknown Device"}
                      </p>
                      <p className="text-gray-500 font-normal">
                        {device.macAddress.toLowerCase()}
                      </p>
                      <p className="flex items-left font-light text-gray-400">
                        {device.rssi}dBm
                      </p>
                    </div>
                    <button
                      onClick={(e) =>
                        handleConnectAndInit(e, device.macAddress)
                      }
                      className={`px-4 py-2 border rounded-md ml-4 transition-colors duration-300 bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white ${
                        loadingMap.get(device.macAddress)
                          ? "bg-gray-600 text-white cursor-not-allowed animate-pulse"
                          : "btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
                      }`}
                      disabled={loadingMap.get(device.macAddress)}
                    >
                      {loadingMap.get(device.macAddress)
                        ? "Processing..."
                        : "Connect"}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No BLE devices detected.</p>
            )}
          </div>
        </div>
      </div>

      {/* Loading Spinner Overlay */}
      {(isAnyDeviceLoading() || isAutoConnecting) && showProgressBar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center">
            <ProgressBar progress={progress} />
            <p className="text-gray-700 mt-4">
              {progress < 100
                ? `Loading data... ${progress}%`
                : "Finishing up..."}
            </p>
          </div>
        </div>
      )}

      {isPopupVisible && (
        <PopupNotification
          matchFound={matchFound}
          onClose={() => setPopupVisible(false)}
          onContinue={handleContinue}
        />
      )}
    </div>
  );
};

export default React.memo(BleButtons);
