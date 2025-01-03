import React, { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Info, Send, ArrowLeft } from "lucide-react";
import { useStore } from "../../store/store";
import { toast } from "react-toastify";
import { Button } from "../../components/reusableCards/Buttons";
import Sidebar from '../../partials/Sidebar';
import Header from '../../partials/Header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/reusableCards/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../components/reusableCards/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/reusableCards/dialog";
import WriteCharacteristicDialog from "../../components/reusableCards/write";

const BleDataPage = React.memo(() => {
  const { state } = useStore();
  const deviceData = state?.initBleData?.dataList || [];
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const categorizedData = useMemo(() => {
    const categories = {
      STS: [],
      CMD: [],
      DTA: [],
      DIA: [],
      ATT: [],
    };

    if (Array.isArray(deviceData)) {
      deviceData.forEach((serviceData) => {
        if (serviceData && serviceData.serviceNameEnum) {
          const category = serviceData.serviceNameEnum.split("_")[0];
          if (categories[category]) {
            categories[category].push(serviceData);
          }
        }
      });
    }

    return categories;
  }, [deviceData]);

  const handleGoBack = useCallback(() => {
    navigate("/home", { replace: true });
  }, [navigate]);

  const publishMqttMessage = async (category) => {
    setLoading(true);
    if (window.WebViewJavascriptBridge) {
      try {
        const topicMap = {
          ATT: "emit/content/bleData/att",
          DTA: "emit/content/bleData/dta",
          DIA: "emit/content/bleData/dia",
          CMD: "emit/content/bleData/cmd",
          STS: "emit/content/bleData/sts",
        };

        const topic = topicMap[category];
        const dataToPublish = {
          category,
          data: categorizedData[category],
        };
        window.WebViewJavascriptBridge.callHandler(
          "mqttPublishMsg",
          dataToPublish,
          () => {
            setLoading(false);
            toast.success("Message published successfully", {
              position: "top-right",
              autoClose: 5000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              progress: undefined,
              theme: "light",
            });
          }
        );
        console.log(`Publishing to ${topic}:`, dataToPublish);

        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error("Error publishing message:", error);
        alert("Failed to publish message. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  const DescriptorsDialog = ({ descriptors }) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-oves-blue">
          Show Descriptors
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-gray-50">Descriptors</DialogTitle>
        </DialogHeader>
        <div className="mt-4 text-gray-50">
          {descriptors && descriptors.length > 0 ? (
            descriptors.map((descItem, index) => (
              <div
                key={index}
                className="flex justify-between items-center mb-2 text-gray-50"
              >
                <code className="text-xs text-gray-50">{descItem.uuid}</code>
                <span className="text-sm text-gray-50">{descItem.desc}</span>
              </div>
            ))
          ) : (
            <div>No descriptors available</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  const CategoryAccordion = ({ category, data }) => (
    <AccordionItem
      title="Accordion Title"
      value={category}
      className="border rounded-lg mb-4 p-4"
    >
      <AccordionTrigger className="flex items-center justify-between w-full">
        <div className="flex items-center space-x-4">
          <h3 className="text-xl font-semibold">{category}</h3>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              publishMqttMessage(category);
            }}
            disabled={loading}
            className="bg-oves-blue text-white"
            size="sm"
          >
            <Send className="mr-2 h-4 w-4" />
            {loading ? "Publishing..." : "Publish"}
          </Button>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        {data.map((serviceData) => (
          <div key={serviceData.uuid} className="mt-4">
            <h4 className="text-lg font-semibold mb-2">
              {serviceData.serviceNameEnum
                ? serviceData.serviceNameEnum.replace(/_/g, " ")
                : "Unnamed Service"}
            </h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Characteristic Name</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Properties</TableHead>
                  <TableHead>Descriptors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(serviceData.characteristicList || {}).map(
                  ([charUuid, characteristic]) => (
                    <TableRow
                      key={`${serviceData.uuid}-${charUuid}`}
                      className="text-sm"
                    >
                      <TableCell className="py-2">
                        <div>
                          <p className="font-semibold">
                            {characteristic.name || "Unnamed Characteristic"}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {characteristic.desc || "No description available"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        {String(characteristic.valType)}
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center space-x-2">
                          {category === "CMD" && (
                            <WriteCharacteristicDialog
                              characteristic={characteristic}
                              serviceUuid={serviceData.uuid}
                            />
                          )}
                          <span>{characteristic.properties}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        {characteristic.descriptors &&
                          Object.keys(characteristic.descriptors).length >
                            0 && (
                            <DescriptorsDialog
                              descriptors={characteristic.descriptors}
                            />
                          )}
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </div>
        ))}
      </AccordionContent>
    </AccordionItem>
  );

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Content area */}
      <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        {/*  Site header */}
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="grow">
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
            {/* Left: Title */}
            <div className="mb-4 sm:mb-0">
                <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">Device Data</h1>
              </div>

            <Accordion type="single" collapsible className="w-full">
              {Object.entries(categorizedData).map(([category, data]) => {
                if (data.length === 0) return null;
                return (
                  <CategoryAccordion
                    key={category}
                    category={category}
                    data={data}
                  />
                );
              })}
            </Accordion>

            <Button
              variant="outline"
              size="icon"
              className="fixed bottom-4 right-4 rounded-full bg-oves-blue"
              onClick={() =>
                alert("Device data categories and their characteristics")
              }
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>
        </main>
      </div>
    </div>
  );
});

export default BleDataPage;
