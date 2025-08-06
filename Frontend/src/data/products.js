import axios from 'axios';
import Api from "./API.json";

const ApiLink = Api.link;

// Initialize as empty array
let productCategories = [];

export const getCategories = () => productCategories;

export const fetchCategories = async () => {
  try {
    const response = await axios.get(`${ApiLink}/api/form/categories`, {
      withCredentials: true
    });
    productCategories = response.data.map(category => category.name);
    return productCategories;
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
};