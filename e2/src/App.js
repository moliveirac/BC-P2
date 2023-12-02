import React, { useEffect, useState } from "react";
import './App.css';
import { create } from 'kubo-rpc-client'
import { ethers } from "ethers"
import { Buffer } from "buffer"
import logo from "./ruleta.png"
import { addresses, abis } from "./contracts"

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000000000000000000000000000";

const defaultProvider = new ethers.providers.Web3Provider(window.ethereum);
const ipfsContract = new ethers.Contract(addresses.ipfs, abis.ipfs, defaultProvider);

async function readCurrentUserFile() {
  const result = await ipfsContract.userFiles(defaultProvider.getSigner().getAddress());
  console.log({ result });
  return result;
}

function App() {
  const [ipfsHash, setIpfsHash] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [lastNumbers, setLastNumbers] = useState(""); 

  useEffect(() => {
    window.ethereum.enable();
  }, []);

  useEffect(() => {
    async function readFile() {
      const file = await readCurrentUserFile();
      if (file !== ZERO_ADDRESS) {
        setIpfsHash(file);
        // Cuando se actualiza el hash, lee y muestra el contenido del archivo
        await readFileContent(file);
      }
    }
    readFile();
  }, [ipfsHash]);

  async function setFileIPFS(hash) {
    const ipfsWithSigner = ipfsContract.connect(defaultProvider.getSigner());
    console.log("TX contract");
    const tx = await ipfsWithSigner.setFileIPFS(hash);
    console.log({ tx });
    setIpfsHash(hash);
  }

  async function readFileContent(hash) {
  try {
    const client = await create('/ip4/0.0.0.0/tcp/5001');
    const generator = client.cat(hash);
    let data = "";
    for await (const chunk of generator) {
      data += Buffer.from(chunk).toString();
    }

    const jsonData = JSON.parse(data);

    const numbers = jsonData.map(entry => entry.numero).join(', ');

    setLastNumbers(numbers);

  } catch (error) {
    console.error("Error reading file content:", error);
  }
}


  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log(fileContent); 
      const client = await create('/ip4/0.0.0.0/tcp/5001');
      const result = await client.add(fileContent);
      await client.files.cp(`/ipfs/${result.cid}`, `/${result.cid}`);
      console.log(result.cid);
      await setFileIPFS(result.cid.toString());
    } catch (error) {
      console.log(error.message);
    }
  };

  const retrieveFile = (e) => {
    const data = e.target.files[0];
    const reader = new window.FileReader();
    reader.readAsText(data);
    reader.onloadend = () => {
      console.log("Text data:", reader.result);
      setFileContent(reader.result);
    };
    e.preventDefault();
  };

return (
  <div className="App">
    <header className="App-header">
      <img src={logo} className="App-logo" alt="logo" />
      <p>Sube los últimos números ganadores</p>
      <form className="form" onSubmit={handleSubmit}>
        <input type="file" name="data" onChange={retrieveFile} />
        <button type="submit" className="btn">Upload</button>
      </form>
      {lastNumbers && (
        <div className="last-numbers">
          Últimos números ganadores: {
            lastNumbers.split(', ').map((number, index, array) => (
              <span key={index} style={{ color: getNumberColor(number) }}>
                {number}
                {index < array.length - 1 && ', '}
              </span>
            ))
          }
        </div>
      )}
    </header>
  </div>
);


// Función para obtener el color de un número específico
function getNumberColor(number) {
  const redNumbers = ['1', '3', '5', '7', '9', '12', '14', '16', '18', '19', '21', '23', '25', '27', '30', '32', '34', '36'];
  const blackNumbers = ['2', '4', '6', '8', '10', '11', '13', '15', '17', '20', '22', '24', '26', '28', '29', '31', '33', '35'];
  const greenNumbers = ['0', '00'];

  if (redNumbers.includes(number)) {
    return 'red';
  } else if (blackNumbers.includes(number)) {
    return 'black';
  } else if (greenNumbers.includes(number)) {
    return 'green';
  }

  // Por defecto, usa el color normal
  return 'inherit';
}
}


export default App;


