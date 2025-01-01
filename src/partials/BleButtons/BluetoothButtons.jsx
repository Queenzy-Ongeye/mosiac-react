import React, { useState } from "react";
import { useStore } from "../../service/store";
import { IBleStateProps } from "../../utility/types";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

const BluetoothButton = ({
  macAddress,
  connectToBluetoothDevice,
  initBleData,
  searchForMatch,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null); // Explicitly typing error as string or null
  const { dispatch } = useStore();

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);

    try {
      setLoading(true);

      // Step 1: Connect to device
      const connectionSuccess = await connectToBluetoothDevice(macAddress);
      if (!connectionSuccess) {
        throw new Error("Failed to connect to device");
      }

      // Step 2: Initialize BLE data
      const initSuccessResponse = await initBleData(macAddress);
      if (!initSuccessResponse) {
        throw new Error("Failed to initialize BLE data");
      }

      // Update state with successful initialization
      dispatch({
        type: "SET_INIT_BLE_DATA_RESPONSE",
        payload: initSuccessResponse,
      });

      // Trigger search after successful initialization
      searchForMatch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Error in Bluetooth connection flow:", message);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={(e) => handleClick}
      disabled={loading}
      className={`
        flex items-center justify-center gap-2 px-4 py-2 rounded
        ${
          loading
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-oves-blue hover:bg-oves-blue"
        }
        text-white font-medium transition-colors
        ${error ? "border-2 border-red-500" : ""}
      `}
    >
      {loading && <AiOutlineLoading3Quarters className="w-4 h-4 animate-spin" />}
      {loading ? "Connecting..." : "Connect Device"}
      {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
    </button>
  );
};

export default BluetoothButton;
