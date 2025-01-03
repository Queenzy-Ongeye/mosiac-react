import React from 'react';
import { MdOutlineTouchApp } from "react-icons/md";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../components/reusableCards/alert-dialog';

const BleTableItem = ({
  id,
  name,
  macAddress,
  rssi,
  image,
  isChecked,
  handleClick,
  fav,
  isLoading,
  onConnect
}) => {
  return (
    <tr>
      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap w-px">
        <div className="flex items-center">
          <label className="inline-flex">
            <span className="sr-only">Select</span>
            <input
              id={id}
              className="form-checkbox"
              type="checkbox"
              onChange={handleClick}
              checked={isChecked}
            />
          </label>
        </div>
      </td>
      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap w-px">
        <div className="flex items-center relative">
          <button>
            <svg
              className={`shrink-0 fill-current ${
                fav ? "text-yellow-500" : "text-gray-300 dark:text-gray-600"
              }`}
              width="16"
              height="16"
              viewBox="0 0 16 16"
            >
              <path d="M8 0L6 5.934H0l4.89 3.954L2.968 16 8 12.223 13.032 16 11.11 9.888 16 5.934h-6L8 0z" />
            </svg>
          </button>
        </div>
      </td>
      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
        <div className="flex items-center">
          <div className="w-10 h-10 shrink-0 mr-2 sm:mr-3">
            <img
              className="rounded-full"
              src={image}
              width="40"
              height="40"
              alt={name}
            />
          </div>
          <div className="font-medium text-gray-800 dark:text-gray-100">
            {name}
          </div>
        </div>
      </td>
      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
        <div className="text-left">{name || "Unknown Device"}</div>
        <div className="text-left font-light">{macAddress}</div>
      </td>
      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap">
        <div className="text-left">{rssi}</div>
      </td>
      <td className="px-2 first:pl-5 last:pr-5 py-3 whitespace-nowrap w-px">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button 
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-400"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400" />
              ) : (
                <MdOutlineTouchApp className="h-6 w-6" />
              )}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="sm:max-w-[425px]">
            <AlertDialogHeader>
              <AlertDialogTitle>Connect to Device</AlertDialogTitle>
              <AlertDialogDescription>
                Do you want to connect to {name || "Unknown Device"}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={onConnect}
                className="bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
              >
                Connect
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </td>
    </tr>
  );
};

export default BleTableItem;