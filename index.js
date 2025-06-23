class ExampleHttpStack {
  createRequest(method, url) {
    return new ExampleRequest(method, url);
  }
  getName() {
    return "ExampleHttpStack";
  }
}

class ExampleRequest {
  constructor(method, url) {
    this.method = method;
    this.url = url;
    this._headers = {};
    this._responseHeaders = {};
  }

  getMethod() {
    return this.method;
  }

  getURL() {
    return this.url;
  }

  async send(body) {
    console.log(
      "Sending request to " + this.url + " with method " + this.method
    );
    // wait fo random time to mimick delay
    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 1000 + 500)
    );
    // now send the fetch request

    const response = await fetch(this.url, {
      method: this.method,
      headers: this._headers || {},
      body,
    });
    console.log("The response here", response);

    console.log("Response Headers:");
    response.headers.forEach((value, key) => {
      console.log(key, value);
    });

    const text = await response.text();

    const respHeaders = {};
    response.headers.forEach((value, key) => {
      respHeaders[key.toLowerCase()] = value;
    });
    this._responseHeaders = respHeaders;

    console.log("The response here 2", response);

    return new ExampleResponse(response, text);
  }

  setHeader(header, value) {
    console.log("Setting header: ", header);
    this._headers[header.toLowerCase()] = value;
  }

  abort() {}

  getHeader(header) {
    console.log("Getting header: ", header);
    const headers = this._responseHeaders || {};
    const foundKey = Object.keys(headers).find(
      (key) => key.toLowerCase() === header.toLowerCase()
    );

    console.log("Getting header: ", header, headers[foundKey]);
    return foundKey ? headers[foundKey] : undefined;
  }

  setProgressHandler() {
    console.log("setProgressHandler called");
  }

  getUnderlyingObject() {
    return undefined;
  }
}

class ExampleResponse {
  constructor(res, resBody) {
    this._res = res;
    console.log("Response object:", res, res.headers);
    this._headers = {};
    res.headers.forEach((value, key) => {
      console.log(key, value);
      this._headers[key.toLowerCase()] = value;
    });
    this._resBody = resBody;
  }

  getStatus() {
    return this._res.status;
  }

  getHeader(header) {
    console.log("Getting header response", header, this._res.headers);
    return this._headers[header.toLowerCase()] || "";
  }

  getBody() {
    return this._resBody;
  }

  getUnderlyingObject() {
    return this._res;
  }
}

async function createAssembly(auth_key, template_id) {
  let environment_secret = "development";

  const assemblyParams = {
    auth: { key: auth_key },
    template_id: template_id,
    fields: {
      environment_secret: environment_secret,
      file_upload_id: Math.floor(Math.random() * 10000000000).toString(),
    },
  };

  const formData = new FormData();
  formData.append("params", JSON.stringify(assemblyParams));
  formData.append("num_expected_upload_files", 1);

  const assembly = await fetch("https://api2.transloadit.com/assemblies", {
    method: "POST",
    body: formData,
    headers: {
      Accept: "application/json",
    },
  });

  const assemblyResponse = await assembly.json();

  return assemblyResponse;
}

async function uploadFile() {
  const file = document.getElementById("fileInput").files[0];
  const parallelUploads = parseInt(
    document.getElementById("parallelUploads").value,
    10
  );

  let auth_key = document.getElementById("authKey").value;
  let template_id = document.getElementById("template").value;

  if (!auth_key || !template_id) {
    alert("Please provide both Auth Key and Template ID");
    return;
  }

  if (!file || parallelUploads < 1) {
    alert("Please select a file and enter a valid number of parallel uploads.");
    return;
  }

  const uploadButton = document.getElementById("uploadbtn");
  const uploadUrlElement = document.getElementById("uploadUrl");

  // Disable the button and show loading state
  uploadButton.disabled = true;
  uploadButton.innerHTML = "Uploading...";

  const data = await createAssembly(auth_key, template_id);

  const tus_url = data["tus_url"];
  const assembly_url = data["assembly_url"];

  const tusUpload = new tus.Upload(file, {
    endpoint: tus_url,
    metadataForPartialUploads: {
      assembly_url,
      filename: file.name ?? "unknown",
      fieldname: "upload",
      partial: true,
    },
    metadata: {
      assembly_url,
      filename: file.name ?? "unknown",
      fieldname: "upload",
    },
    parallelUploads: parallelUploads,
    chunkSize: 20 * 1024 * 1024,
    httpStack: new ExampleHttpStack(),
    onError(e) {
      console.log("And the error is: ", e);
      alert("Upload failed. Please try again.");
      uploadButton.disabled = false;
      uploadButton.textContent = "Upload Now";
    },
    onSuccess() {
      console.log("Upload finished successfully", tusUpload.url);
      uploadUrlElement.textContent = `Upload URL: ${tusUpload.url}`;
      uploadButton.disabled = false;
      uploadButton.textContent = "Upload Now";
    },
  });

  console.log("Starting upload");
  await tusUpload.start();
}

document.getElementById("uploadbtn").addEventListener("click", uploadFile);
