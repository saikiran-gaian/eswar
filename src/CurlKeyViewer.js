import React, { useState } from "react";
import axios from "axios";
import "./CurlExecutor.css"; // Import CSS for styling
import FlowMapping from "./FlowMapping";

const CurlExecutor = () => {
  const [curlInput, setCurlInput] = useState("");
  const [response, setResponse] = useState(null);
  const [keys, setKeys] = useState([]);
  const [expandedKeys, setExpandedKeys] = useState({});
  const [error, setError] = useState(null);
  const [mappedData, setMappedData] = useState([]);

  const parseCurlCommand = (curlCommand) => {
    const curlObj = {
      url: "",
      method: "GET",
      headers: {},
      data: {}
    };

    const lines = curlCommand.split("\\\n");

    lines.forEach((line) => {
      if (line.includes("--location")) {
        const urlMatch = line.match(/'(.*?)'/);
        curlObj.url = urlMatch ? urlMatch[1] : "";
      } else if (line.includes("--header")) {
        const headerMatch = line.match(/--header '(.*?): (.*?)'/);
        if (headerMatch) {
          curlObj.headers[headerMatch[1]] = headerMatch[2];
        }
      } else if (line.includes("--data")) {
        const dataMatch = line.match(/--data '(.*)'/);
        if (dataMatch) {
          curlObj.data = JSON.parse(dataMatch[1]);
          curlObj.method = "POST";
        }
      }
    });

    return curlObj;
  };

  const cleanKey = (key) => {
    // This regex will remove any numbers that are standalone or followed by a dot (.)
    return key.replace(/(^|\.)\d+(\.|$)/g, '$1');
  };
  

  const getFirstLevelKeys = (obj, prefix = '') => {
    let keys = [];
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const prefixedKey = prefix ? `${prefix}.${key}` : key;
        keys.push(cleanKey(prefixedKey));
      }
    }
    return keys;
  };

  const getNestedKeys = (obj, prefix = '') => {
    let keys = [];
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const cleanKeyName = cleanKey(key); // Clean up the key
        const prefixedKey = prefix ? `${prefix}.${cleanKeyName}` : cleanKeyName;
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          keys.push(prefixedKey);
          keys = keys.concat(getNestedKeys(obj[key], prefixedKey));
        } else {
          keys.push(prefixedKey);
        }
      }
    }
    return keys;
  };

  const handleRunClick = async () => {
    try {
      const parsedCurl = parseCurlCommand(curlInput);
      const response = await axios({
        url: parsedCurl.url,
        method: parsedCurl.method,
        headers: parsedCurl.headers,
        data: parsedCurl.data
      });
      const data = response.data;
      setResponse(JSON.stringify(data, null, 2));
      const firstLevelKeys = getFirstLevelKeys(data);
      setKeys(firstLevelKeys);
      setError(null);
    } catch (err) {
      setError(err.message);
      setResponse(null);
      setKeys([]);
    }
  };

  const handleKeyExpand = (key) => {
    if (!expandedKeys[key]) {
      const nestedKeys = getNestedKeys(getValueByPath(JSON.parse(response), key));
      setExpandedKeys((prevState) => ({
        ...prevState,
        [key]: nestedKeys
      }));
    } else {
      setExpandedKeys((prevState) => {
        const newState = { ...prevState };
        delete newState[key];
        return newState;
      });
    }
  };

  const getValueByPath = (obj, path) => {
    const paths = path.split('.');
    let current = obj;

    for (const key of paths) {
      if (current && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }

    return current;
  };

  const mobiusKeys = [
    "Mobius_PI_Direct_time",
    "Mobius_PI_Direct_product_type",
    "Mobius_PI_Direct_user_type",
    "Mobius_PI_Direct_avg_cost",
    "Mobius_PI_Direct_storage_growth",
    "Mobius_PI_Direct_cost_fluctuation",
    "Mobius_PI_Inferred_avg_usage_growth_rate",
    "Mobius_PI_Direct_date",
    "Mobius_PI_Direct_user_id",
    "Mobius_PI_Inferred_storage_changes",
    "Mobius_PI_Inferred_highest_cost_fluctuation",
    "Mobius_PI_Inferred_lowest_cost_fluctuation",
    "Mobius_PI_Derived_rolling_avg_cost",
    "Mobius_PI_Inferred_lowest_cost_efficiency",
    "Mobius_PI_Direct_avg_usage",
    "Mobius_PI_Derived_cost_to_usage_ratio",
    "Mobius_PI_Derived_rolling_avg_usage",
    "Mobius_PI_Inferred_cost_efficiency_trend",
    "Mobius_PI_Inferred_usage_efficiency_trend",
    "Mobius_PI_Derived_avg_cost_per_usage",
    "Mobius_PI_Inferred_highest_storage_growth",
    "Mobius_PI_Inferred_lowest_storage_growth",
    "Mobius_PI_Derived_avg_cost_per_storage_growth",
    "Mobius_PI_Inferred_highest_cost_efficiency",
    "Mobius_PI_Inferred_cumulative_cost",
    "Mobius_PI_cumulative_usage",
    "Mobius_PI_Inferred_highest_usage",
    "Mobius_PI_Inferred_lowest_usage",
    "Mobius_PI_Inferred_cost_distribution",
    "Mobius_PI_Direct_peak_hour",
    "Mobius_PI_Inferred_avg_storage_growth_rate",
    "Mobius_PI_Inferred_cost_changes",
    "Mobius_PI_Inferred_usage_changes",
    "Mobius_PI_Inferred_total_usage",
    "Mobius_PI_Inferred_total_cost",
    "Mobius_PI_Direct_api_call_volume",
    "Mobius_PI_Inferred_growth_rate",
    "Mobius_PI_Direct_id",
    "Mobius_PI_Direct_PlatformName"
  ];
  

  const handleMappings = (mappings) => {
    if (response) {
      const parsedResponse = JSON.parse(response);
      const mappedResults = [];

      // Iterate over the mappings created by the user
      mappings.forEach(({ source, target }) => {
        // Get the value(s) from the response using the source key
        const values = getValuesByPath(parsedResponse, source);

        // Determine if the key's parent is an array and create objects accordingly
        values.forEach((value, index) => {
          const parentPath = getParentPath(source);
          const parentValue = getValuesByPath(parsedResponse, parentPath);

          if (Array.isArray(parentValue) && parentValue.length > 1) {
            if (!mappedResults[index]) {
              mappedResults[index] = {};
            }
            mappedResults[index][target] = value;
          } else {
            if (mappedResults.length === 0) {
              mappedResults.push({ [target]: value });
            } else {
              mappedResults[0][target] = value;
            }
          }
        });
      });

      setMappedData(mappedResults);
    }
  };

  // Extract the parent path from the source key
  const getParentPath = (path) => {
    const parts = path.split('.');
    parts.pop(); // Remove the last part (the key itself)
    return parts.join('.');
  };

  // Helper function to get values by a given path
  const getValuesByPath = (obj, path) => {
    const paths = path.replace(/\[(\w+)\]/g, '.$1').split('.');
    let current = obj;
    const values = [];

    const traverse = (o, i) => {
      if (i === paths.length) {
        values.push(o);
        return;
      }

      const key = paths[i];
      if (o && Array.isArray(o[key])) {
        o[key].forEach((item) => traverse(item, i + 1));
      } else if (o && o[key] !== undefined) {
        traverse(o[key], i + 1);
      }
    };

    traverse(current, 0);
    return values;
  };

  return (
    <><div>
      <div className="curl-executor">
        <textarea
          className="curl-input"
          value={curlInput}
          onChange={(e) => setCurlInput(e.target.value)}
          placeholder="Paste your curl command here..."
        />
        <button className="run-button" onClick={handleRunClick}>
          Run
        </button>
        <div className="response-container">
          <h3>Response:</h3>
          <pre>{response ? response : "No response yet..."}</pre>
          {error && <p className="error-message">{error}</p>}
        </div>
        <div className="keys-container">
          <h3>Extracted Keys:</h3>
          <ul>
            {keys.length > 0 ? keys.map((key, index) => (
              <li key={index}>
                <input
                  type="checkbox"
                  onChange={() => handleKeyExpand(key)}
                  checked={expandedKeys[key] !== undefined}
                />
                {key}
                {expandedKeys[key] && (
                  <ul>
                    {expandedKeys[key].map((nestedKey, nestedIndex) => (
                      <li key={nestedIndex}>{nestedKey}</li>
                    ))}
                  </ul>
                )}
              </li>
            )) : <li>No keys extracted yet...</li>}
          </ul>
        </div>
      </div>

      <FlowMapping
        extractedKeys={Object.values(expandedKeys).flat()}
        mobiusKeys={mobiusKeys}
        onMappingsChange={handleMappings}
      />
    </div>

      <div className="mapped-data-container">
        {mappedData.map((data, index) => (
          <pre key={index}>{JSON.stringify(data, null, 2)}</pre>
        ))}
      </div></>
  );
};

export default CurlExecutor;
