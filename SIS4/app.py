import streamlit as st
import os
from dotenv import load_dotenv
from ocr_module import extract_text_from_image, process_pdf
from llm_module import extract_invoice_data

load_dotenv()
st.set_page_config(page_title="AI Invoice Extractor", page_icon="🧾", layout="centered")

st.title("🧾 SME Invoice Data Extractor")
api_key = st.sidebar.text_input("OpenAI API Key", type="password", value=os.getenv("OPENAI_API_KEY", ""))
uploaded_file = st.file_uploader("Upload Invoice", type=["png", "jpg", "jpeg", "pdf"])

if uploaded_file:
    if not api_key:
        st.warning("Please enter your OpenAI API key.")
    else:
        with st.spinner("Processing..."):
            try:
                if uploaded_file.type == "application/pdf":
                    extracted_text = process_pdf(uploaded_file)
                else:
                    extracted_text = extract_text_from_image(uploaded_file)
                
                with st.expander("Show Raw OCR Text"):
                    st.text(extracted_text)

                result = extract_invoice_data(extracted_text, api_key)
                
                st.success("Extraction Complete!")
                col1, col2 = st.columns(2)
                col1.metric("Company Name", result.get("company_name", "N/A"))
                col1.metric("Invoice Date", result.get("date", "N/A"))
                col2.metric("Invoice #", result.get("invoice_number", "N/A"))
                col2.metric("Total Amount", result.get("total_amount", "N/A"))
                st.json(result)
            except Exception as e:
                st.error("Error: " + str(e))
