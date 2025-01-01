import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../reusableCards/dialog"
import { Button } from "../reusableCards/Buttons"
import { Input } from "../reusableCards/input"

const InputDialog = ({ title, subtitle, isOpen, onClose, onSubmit }) => {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    onSubmit(value);
    setValue('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Input
              placeholder="Please enter an ASCII string"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            CANCEL
          </Button>
          <Button onClick={() => navigator.clipboard.readText().then(text => setValue(text))}>
            PASTE
          </Button>
          <Button onClick={handleSubmit}>
            SUBMIT
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InputDialog;
