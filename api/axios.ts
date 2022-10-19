import axios from "axios";

const URL = "http://localhost:5000";

export default axios.create({
  baseURL: URL,
});