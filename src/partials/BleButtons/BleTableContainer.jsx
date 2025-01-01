import React, { useState } from 'react';
import { Button } from "../reusableCards/Buttons"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../reusableCards/dialog"
import { Input } from "../reusableCards/input"

const BleDataTableItem = ({ characteristic, serviceUuid }) => {
  const [showDialog, setShowDialog] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const handleWrite = async (newValue) => {
    if (window.WebViewJavascriptBridge) {
      try {
        const writeData = {
          serviceUuid: serviceUuid,
          characteristicUuid: characteristic.uuid,
          value: newValue
        };
        
        window.WebViewJavascriptBridge.callHandler(
          "writeCharacteristic",
          writeData,
          (response) => {
            console.log('Write response:', response);
            setShowDialog(false);
          }
        );
      } catch (error) {
        console.error('Error writing characteristic:', error);
        alert('Failed to write value. Please try again.');
      }
    }
  };

  const handleRead = async () => {
    if (window.WebViewJavascriptBridge) {
      try {
        const readData = {
          serviceUuid: serviceUuid,
          characteristicUuid: characteristic.uuid
        };
        
        window.WebViewJavascriptBridge.callHandler(
          "readCharacteristic",
          readData,
          (response) => {
            console.log('Read response:', response);
          }
        );
      } catch (error) {
        console.error('Error reading characteristic:', error);
        alert('Failed to read value. Please try again.');
      }
    }
  };

  const getCmdDescription = (name) => {
    const descriptions = {
      'pubk': 'Public Key / Last Code',
      'read': 'Last read request of ANY GATT <data> = [opid|...]',
      'rptm': 'Set notification request mode = [0|1|2|3|4], 0',
      'hbfq': 'Heart Beat Interval Minutes',
      'gctw': 'Gateway Control',
    };
    return descriptions[name.toLowerCase()] || '';
  };

  return (
    <tr>
      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
        <div>
          <p className="font-semibold">{characteristic.name}</p>
          <p className="text-xs text-gray-500 mt-1">
            {getCmdDescription(characteristic.name)}
          </p>
        </div>
      </td>
      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
        <div className="font-medium text-gray-800 dark:text-gray-100">
          {characteristic.valType}
        </div>
      </td>
      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-blue-600"
            onClick={handleRead}
          >
            READ
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-pink-600"
            onClick={() => setShowDialog(true)}
          >
            WRITE
          </Button>
        </div>
      </td>
      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
        {characteristic.descriptors && characteristic.descriptors.length > 0 && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                Show Descriptors
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Descriptors</DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                {characteristic.descriptors.map((descriptor, index) => (
                  <div key={index} className="flex justify-between items-center mb-2">
                    <code className="text-xs">{descriptor.uuid}</code>
                    <span className="text-sm">{descriptor.desc}</span>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </td>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{characteristic.name}</DialogTitle>
            <p className="text-sm text-gray-500">{getCmdDescription(characteristic.name)}</p>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Input
                placeholder="Please enter an ASCII string"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              CANCEL
            </Button>
            <Button onClick={() => navigator.clipboard.readText().then(text => setInputValue(text))}>
              PASTE
            </Button>
            <Button onClick={() => handleWrite(inputValue)}>
              SUBMIT
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </tr>
  );
};

export default BleDataTableItem;
