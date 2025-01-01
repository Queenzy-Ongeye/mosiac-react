import React, { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Info, Send, ArrowLeft } from "lucide-react";
import { useStore } from "../../store/store"
import { toast } from "react-toastify";
import { Button } from "../../components/reusableCards/Buttons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/reusableCards/table";
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

  const [activeCategory, setActiveCategory] = useState("STS");
  const [loading, setLoading] = useState(false);

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

  const availableCategories = Object.keys(categorizedData).filter(
    (category) => categorizedData[category].length > 0
  );

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
          (responseData) => {
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

  return (
    <div className="container mx-auto py-4">
      <div className="mb-2 flex mt-12">
        <Button onClick={handleGoBack} variant="outline" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4 bg-oves-blue text-white" />
        </Button>
        <h1 className="text-3xl font-bold mb-6">Device Data</h1>
      </div>

      <Button
        onClick={() => publishMqttMessage(activeCategory)}
        disabled={loading}
        className="mb-4 bg-oves-blue text-white"
      >
        <Send className="mr-2 h-4 w-4" />
        {loading ? "Publishing..." : `Publish ${activeCategory} Data`}
      </Button>

      <div className="flex mb-6 space-x-2">
        {availableCategories.map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`inline-flex items-center justify-center text-sm font-medium leading-5 rounded-full px-3 py-1 border border-transparent shadow-sm bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-800 transition ${
              activeCategory === category
                ? "inline-flex items-center justify-center text-sm font-medium leading-5 rounded-full px-3 py-1 border border-transparent shadow-sm bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-800 transition"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {categorizedData[activeCategory]?.length > 0 ? (
        categorizedData[activeCategory].map((serviceData) => (
          <div key={serviceData.uuid} className="mb-8">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-bold">
                {serviceData.serviceNameEnum
                  ? serviceData.serviceNameEnum.replace(/_/g, " ")
                  : "Unnamed Service"}
              </h2>
            </div>

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
                          {activeCategory === "CMD" && (
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
        ))
      ) : (
        <div>No data available for this category</div>
      )}

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
  );
});

export default BleDataPage;
