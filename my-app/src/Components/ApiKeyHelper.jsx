import React from "react";

function ApiKeyHelper() {
  return (
    <div
      style={{
        padding: "20px",
        maxWidth: "800px",
        margin: "0 auto",
        fontFamily: "Arial, sans-serif",
        lineHeight: "1.6",
      }}
    >
      <h1>Google Maps API Key Setup</h1>

      <p>
        To use the map features in ChainRide, you need to set up a Google Maps
        API key. Follow these steps:
      </p>

      <ol>
        <li>
          Go to the{" "}
          <a
            href="https://console.cloud.google.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Cloud Console
          </a>
        </li>
        <li>Create a new project or select an existing one</li>
        <li>Navigate to "APIs &amp; Services" {">"} "Library"</li>
        <li>
          Search for and enable the following APIs:
          <ul>
            <li>Maps JavaScript API</li>
            <li>Geocoding API</li>
            <li>Places API</li>
            <li>Directions API</li>
          </ul>
        </li>
        <li>Go to "APIs &amp; Services" {">"} "Credentials"</li>
        <li>Click "Create Credentials" {">"} "API Key"</li>
        <li>Copy the generated API key</li>
        <li>
          Open the file <code>my-app/.env</code> in your project
        </li>
        <li>
          Replace <code>YOUR_GOOGLE_MAPS_API_KEY_HERE</code> with your actual
          API key
        </li>
        <li>Save the file and restart the application</li>
      </ol>

      <h2>Securing Your API Key</h2>

      <p>For security, it's recommended to restrict your API key:</p>

      <ol>
        <li>
          In the Google Cloud Console, go to "APIs &amp; Services" {">"}{" "}
          "Credentials"
        </li>
        <li>Find your API key and click "Edit"</li>
        <li>
          Under "Application restrictions", select "HTTP referrers (websites)"
        </li>
        <li>
          Add your domain (for development, you can add <code>localhost/*</code>
          )
        </li>
        <li>
          Under "API restrictions", restrict the key to only the APIs you're
          using
        </li>
        <li>Click "Save"</li>
      </ol>

      <p>
        <strong>Note:</strong> The free tier of Google Maps Platform includes
        $200 of monthly usage, which is more than enough for development and
        small applications.
      </p>
    </div>
  );
}

export default ApiKeyHelper;
