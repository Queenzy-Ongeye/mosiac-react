import React, { useState } from "react";
import { AiOutlineCheckCircle, AiOutlineCloseCircle } from "react-icons/ai";

const PopupNotification = ({ matchFound, onClose, onContinue }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white w-11/12 sm:w-80 p-6 rounded-lg shadow-lg text-center">
        {matchFound ? (
          <>
            <AiOutlineCheckCircle className="text-green-500 text-5xl mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-800">
              Device Matched!
            </h2>
            <p className="text-sm text-oves-blue mt-2">
              Successfully found a matching device.
            </p>
            <button
              onClick={onContinue} // Trigger navigation to the device data page
              className="w-full mt-6 py-2 rounded-lg text-oves-blue font-medium transition border shadow-inner border-oves-blue"
            >
              View Device Data
            </button>
          </>
        ) : (
          <>
            <AiOutlineCloseCircle className="text-red-500 text-5xl mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-800">
              No Match Found
            </h2>
            <p className="text-sm text-gray-600 mt-2">
              Please try connecting to another device.
            </p>
            <button
              onClick={onClose}
              className={`w-full mt-6 py-2 rounded-lg text-oves-blue font-medium transition border shadow-inner border-oves-blue`}
            >
              Retry
            </button>
          </>
        )}
      </div>
    </div>
  );
};
export default PopupNotification;
