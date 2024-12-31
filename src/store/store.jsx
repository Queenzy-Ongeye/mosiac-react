import React, { createContext, useReducer, useContext } from "react";

// Initial state with the newly added states, including BLE connection status
const initialState = {
  bridgeInitialized: false,
  isScanning: false,
  bleData: [],
  detectedDevices: [], // BLE devices detected
  initBleData: null, // State for BLE initialization data
  isQRScanning: false, // New state to track if QR scanning is active
  scannedData: null, // State to hold the scanned QR or barcode data
  isLoading: false,
  mqttClient: null, // MQTT client state
  mqttMessage: null, // MQTT message state
  matchingDevice: null, // Holds the BLE device that matches the scanned QR or barcode
  initBleDataResponse: null, // State for BLE initialization response
  bleConnectionStatus: "disconnected", // New state for BLE connection status
  connectedMacAddress: null,
};

// Reducer function that handles actions and updates the state accordingly
const reducer = (state, action) => {
  switch (action.type) {
    case "SET_BRIDGE_INITIALIZED":
      return { ...state, bridgeInitialized: action.payload };
    case "SET_IS_SCANNING":
      return { ...state, isScanning: action.payload };
    case "SET_BLE_DATA":
      return { ...state, bleData: action.payload };
    case "SET_IS_LOADING":
      return { ...state, isLoading: action.payload };
    case "ADD_DETECTED_DEVICE":
      return {
        ...state,
        detectedDevices: [...state.detectedDevices, action.payload],
      };
    case "SET_INIT_BLE_DATA":
      return { ...state, initBleData: action.payload };
    case "SET_QR_SCANNING":
      return { ...state, isQRScanning: action.payload }; // Action for setting QR scanning status
    case "SET_SCANNED_DATA":
      return { ...state, scannedData: action.payload }; // Action for storing scanned QR/barcode data
    case "SET_MQTT_CLIENT":
      return { ...state, mqttClient: action.payload };
    case "SET_MQTT_MESSAGE":
      return { ...state, mqttMessage: action.payload }; // Action for storing MQTT message
    case "SET_MATCHING_DEVICE":
      return { ...state, matchingDevice: action.payload }; // Action for setting the matching BLE device
    case "SET_INIT_BLE_DATA_RESPONSE":
      return { ...state, initBleDataResponse: action.payload };
    case "SET_BLE_CONNECTION_STATUS":
      return { ...state, bleConnectionStatus: action.payload }; // Action for setting BLE connection status
    case "SET_CONNECTED_MAC_ADDRESS":
      return {...state, connectedMacAddress: action.payload};
    default:
      return state;
  }
};

// Context setup for the store
const StoreContext = createContext();

// Store Provider to wrap the application with the state and dispatch actions
export const StoreProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
};

// Hook to use the store in components
export const useStore = () => useContext(StoreContext);
