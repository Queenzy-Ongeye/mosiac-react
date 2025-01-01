import React, { useState } from "react";
import { Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../reusableCards/dialog";
import { Button } from "../reusableCards/Buttons";
import { Input } from "../reusableCards/input";

const WriteCharacteristicDialog = ({ characteristic, serviceUuid }) => {
  const [showDialog, setShowDialog] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const handleWrite = async (newValue) => {
    if (window.WebViewJavascriptBridge) {
      try {
        const writeData = {
          serviceUuid: serviceUuid,
          characteristicUuid: characteristic.uuid,
          value: newValue,
        };

        window.WebViewJavascriptBridge.callHandler(
          "writeCharacteristic",
          writeData,
          (response) => {
            console.log("Write response:", response);
            setShowDialog(false);
          }
        );
      } catch (error) {
        console.error("Error writing characteristic:", error);
        alert("Failed to write value. Please try again.");
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleWrite(inputValue);
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-oves-blue">
          <Send className="mr-2 h-4 w-4" />
          Write
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white">
        <DialogHeader>
          <DialogTitle>Write Characteristic</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="ascii-input"
              className="text-sm font-medium leading-none"
            >
              Please enter an ASCII string
            </label>
            <Input
              id="ascii-input"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full"
              placeholder="Enter value..."
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDialog(false)}
              className="inline-flex items-center justify-center text-sm font-medium leading-5 rounded-full px-3 py-1 border border-transparent shadow-sm bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-800 transition"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="inline-flex items-center justify-center text-sm font-medium leading-5 rounded-full px-3 py-1 border border-transparent shadow-sm bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-800 transition"
            >
              Submit
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default WriteCharacteristicDialog;
