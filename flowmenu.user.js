// ==UserScript==
// @name         Flow Account Menu
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Displays a list of products in Flow Account
// @author       You
// @match        *.flowaccount.com/*/business/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @updateURL    https://raw.githubusercontent.com/amajio/flowacc/main/flowmenu.user.js
// @downloadURL  https://raw.githubusercontent.com/amajio/flowacc/main/flowmenu.user.js
// ==/UserScript==

(function () {
    'use strict';

    GM_addStyle(`
        #select-popup {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border: 2px solid #ccc;
            z-index: 9999;
            display: none;
            width: 700px;
            height: 800px;
            overflow-y: auto;
        }
        #options-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
        }
        #options-table th, #options-table td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid #ddd;
            font-size: 16px;
        }
        #options-table th {
            background-color: #f2f2f2;
        }
        .amount-input, .extra-input {
            width: 80px;
            padding: 5px;
            box-sizing: border-box;
        }

        #controls-container {
            position: sticky;
            bottom: 0;
            background: white;
            padding: 10px 0;
            border-top: 1px solid #ccc;
        }
        #selected-count {
            margin-bottom: 10px;
            font-weight: bold;
            font-size: 15px;
            color: #333;
        }

        #submit-selections, #clear-amount, #close-popup, #product-list {
            padding: 10px 30px;
            font-size: 16px;
            cursor: pointer;
            color: white;
            border: none;
            border-radius: 5px;
            background-color: #2898CB;
        }

        #submit-selections:hover,#close-popup:hover,#clear-amount:hover,#product-list:hover {
            background-color: #2887B6;
        }

        #save-product-list, #close-product-list{
            position: sticky;
            bottom: 0;
            border-radius: 5px;
            font-size: 16px;
            background-color: #2898CB;
            color: white;
            border: none;
        }

        #save-product-list:hover,#close-product-list:hover {
            background-color: #2887B6;
        }

        #close-popup {
            position: absolute;
            right: 0px;
        }

        #openPopupButton {
            z-index: 99999;
            top: 19px;
            right: 410px;
            position: fixed;
            padding: 10px 30px;
            font-size: 16px;
            cursor: pointer;
            background-color: #88C426;
            color: white;
            border: none;
        }

        #openPopupButton:hover {
            color: white;
            background-color: #74AC18;
        }
    `);

    // Create the popup HTML structure
    const popup = document.createElement('div');
    popup.id = 'select-popup';
    popup.style.height = '80vh';
    popup.innerHTML = `
        <table id="options-table">
            <thead>
                <tr>
                    <th>สินค้า</th>
                    <th>จำนวน</th>
                    <th>แถม</th>
                </tr>
            </thead>
            <tbody id="options-list"></tbody>
        </table>
        <div id="controls-container">
            <div id="selected-count">สินค้า: 0 รายการ | รายการในบิล: 0 รายการ | ทั้งหมด: 0 ชิ้น</div>
            <button id="submit-selections">ยืนยัน</button>
            <button id="clear-amount">ล้างจำนวน</button>
            <button id="product-list">รายการสินค้า</button>
            <button id="close-popup">ปิด</button>
        </div>
    `;

    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            onUrlChange();
        }
    });

    observer.observe(document, { subtree: true, childList: true });

    document.body.appendChild(popup);
    const openPopupButton = document.createElement('button');
    openPopupButton.id = 'openPopupButton';
    openPopupButton.innerText = 'รายการสินค้า';
    openPopupButton.style.borderRadius = '5px';
    document.body.appendChild(openPopupButton);

    openPopupButton.addEventListener('click', () => {
        popup.style.display = 'block';
    });

    onUrlChange();

    document.getElementById('product-list').addEventListener('click', () => {
        popup.style.display = 'none';
        openTextAreaPopup();
    });

    document.getElementById('close-popup').addEventListener('click', () => {
        popup.style.display = 'none';
    });

    document.getElementById('clear-amount').addEventListener('click', () => {
        // Clear all amount and extra input fields
        const amountInputs = document.querySelectorAll('.amount-input');
        const extraInputs = document.querySelectorAll('.extra-input');
        amountInputs.forEach(function(input) {input.value = 0;});
        extraInputs.forEach(function(input) {input.value = 0;});
        updateSelectedCount();
    });

    function onUrlChange() {
        const paths = ["invoices/new", "billing-notes/new", "quotations/new"];
        openPopupButton.style.display = paths.some(path => location.href.includes(path)) ? 'block' : 'none';
    }

    // Function to simulate typing in an input field
    function simulateTyping(inputElement, value) {
        const event = new Event('input', { 'bubbles': true, 'cancelable': true });
        inputElement.value = value;
        inputElement.dispatchEvent(event);
        inputElement.blur();
    }

    // Function to simulate clicking an input field
    function simulateClick(inputElement) {
        const clickEvent = new MouseEvent('click', { 'bubbles': true, 'cancelable': true });
        inputElement.dispatchEvent(clickEvent);
    }

    // Function to select the first dropdown option
    function selectFirstDropdownOption(inputElement) {
        simulateClick(inputElement);
        setTimeout(() => {
            const dropdownOptions = inputElement.closest('typeahead-custom').querySelectorAll('.tt-suggestion');
            if (dropdownOptions.length > 0) {
                dropdownOptions[0].click();
            }
        }, 1000);
    }

    // Function to process input fields
    document.getElementById('submit-selections').addEventListener('click', () => {
        const selectedProducts = [];
        const amountInputs = document.querySelectorAll('.amount-input');
        const extraInputs = document.querySelectorAll('.extra-input');

        amountInputs.forEach((amountInput, index) => {
            const productName = amountInput.getAttribute('data-product');
            const amountValue = parseInt(amountInput.value, 10) || 0;
            const extraValue = parseInt(extraInputs[index].value, 10) || 0;

            if (amountValue > 0 || extraValue > 0) {
                selectedProducts.push({
                    product: productName,
                    amount: amountValue,
                    extra: extraValue
                });
            }
        });

        if (selectedProducts.length == 0) {
            alert('0 items');
            return;
        }
        popup.style.display = 'None';

        let inputIndex = 1;
        let selectedProductIndex = 0;

        function processNextInput() {
            /*if (selectedProductIndex >= selectedProducts.length) {
                popup.style.display = 'none';
                return;
            }*/

            const selectedProduct = selectedProducts[selectedProductIndex];

            // Skip if amount = 0 and extra = 0
            if (selectedProduct.amount === 0 && selectedProduct.extra === 0) {
                selectedProductIndex++;
                setTimeout(processNextInput, 1000); // Move to the next product
                return;
            }

            const rowXPath = `//*[@id="not-batch-document-table"]/flowaccount-product-item-table/table/tbody/tr[${inputIndex}]`;
            const inputXPath = `${rowXPath}/td[3]/typeahead-custom/div/div[1]/span/input`;
            const amountXPath = `${rowXPath}/td[4]/input`;
            const priceXPath = `${rowXPath}/td[6]/input`;
            const addButtonXPath = `//*[@id="paper-content"]/section[2]/div/div/section[1]/button`;

            const productInput = document.evaluate(inputXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            const amountInput = document.evaluate(amountXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            const priceInput = document.evaluate(priceXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
            const addButton = document.evaluate(addButtonXPath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

            if (!productInput) {
                handleMissingProductInput(addButton);
                return;
            }

            if (productInput.value.trim() !== "") {
                inputIndex++;
                setTimeout(processNextInput, 300);
                return;
            }

            // Process main row if amount > 0
            if (selectedProduct.amount > 0) {
                processMainRow(selectedProduct, productInput, amountInput, priceInput, addButton);
            } else if (selectedProduct.extra > 0) {
                processExtraRowOnly(selectedProduct, productInput, amountInput, priceInput, addButton);
            }
        }

        function handleMissingProductInput(addButton) {
            if (addButton) {
                addButton.click();
                setTimeout(processNextInput, 200); // Wait 1 sec before retrying
            } else {
                console.log("Add button not found!");
            }
        }

        function processMainRow(selectedProduct, productInput, amountInput, priceInput, addButton) {
            simulateTyping(productInput, selectedProduct.product);
            selectFirstDropdownOption(productInput);

            setTimeout(() => {
                if (amountInput) {
                    simulateTyping(amountInput, selectedProduct.amount);
                    amountInput.focus();
                    const changeEvent = new Event('change', { bubbles: true, cancelable: true });
                    amountInput.dispatchEvent(changeEvent);
                }

                // If extra > 0, add a new row for the extra amount
                if (selectedProduct.extra > 0) {
                    addNewRowForExtra(selectedProduct, addButton);
                } else {
                    selectedProductIndex++;
                    setTimeout(processNextInput, 200); // Move to the next product
                }
            }, 1000); // Wait 1 second before processing amount and price
        }

        function processExtraRowOnly(selectedProduct, productInput, amountInput, priceInput, addButton) {
            simulateTyping(productInput, selectedProduct.product);
            selectFirstDropdownOption(productInput);

            setTimeout(() => {
                if (amountInput) {
                    simulateTyping(amountInput, selectedProduct.extra);
                    amountInput.focus();
                    const changeEvent = new Event('change', { bubbles: true, cancelable: true });
                    amountInput.dispatchEvent(changeEvent);
                }

                // Set price to 0 for the extra row
                if (priceInput) {
                    simulateTyping(priceInput, 0);
                    priceInput.focus();
                    const priceChangeEvent = new Event('change', { bubbles: true, cancelable: true });
                    priceInput.dispatchEvent(priceChangeEvent);
                }

                selectedProductIndex++;
                setTimeout(processNextInput, 200); // Move to the next product
            }, 1000); // Wait 1 second before processing the extra row
        }

        function addNewRowForExtra(selectedProduct, addButton) {
            setTimeout(() => {
                if (addButton) {
                    addButton.click();
                }

                inputIndex++;

                // Process the new row for the extra amount
                setTimeout(() => {
                    const newRowXPath = `//*[@id="not-batch-document-table"]/flowaccount-product-item-table/table/tbody/tr[${inputIndex}]`;
                    const newProductInput = document.evaluate(`${newRowXPath}/td[3]/typeahead-custom/div/div[1]/span/input`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    const newAmountInput = document.evaluate(`${newRowXPath}/td[4]/input`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    const newPriceInput = document.evaluate(`${newRowXPath}/td[6]/input`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

                    if (newProductInput && newAmountInput && newPriceInput) {
                        simulateTyping(newProductInput, selectedProduct.product);
                        selectFirstDropdownOption(newProductInput);

                        setTimeout(() => {
                            simulateTyping(newAmountInput, selectedProduct.extra);
                            newAmountInput.focus();
                            const changeEvent = new Event('change', { bubbles: true, cancelable: true });
                            newAmountInput.dispatchEvent(changeEvent);

                            simulateTyping(newPriceInput, 0);
                            newPriceInput.focus();
                            const priceChangeEvent = new Event('change', { bubbles: true, cancelable: true });
                            newPriceInput.dispatchEvent(priceChangeEvent);

                            selectedProductIndex++;
                            setTimeout(processNextInput, 200); // Move to the next product
                        }, 1000); // Wait 1 second before filling the new row
                    }
                }, 1000); // Wait 1 second before processing the new row
            }, 1000); // Wait 1 second before adding the new row
        }
        processNextInput();
    });


    function openTextAreaPopup() {
        const txtPopup = document.createElement('div');
        txtPopup.style.position = 'fixed';
        txtPopup.style.height = '90vh';
        txtPopup.style.width = '600px';
        txtPopup.style.top = '50%';
        txtPopup.style.left = '50%';
        txtPopup.style.transform = 'translate(-50%, -50%)';
        txtPopup.style.backgroundColor = '#fff';
        txtPopup.style.padding = '20px';
        txtPopup.style.border = '1px solid #ccc';
        txtPopup.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
        txtPopup.style.zIndex = '9999';
        txtPopup.style.overflow = 'auto';

        // Create a textarea element
        const textArea = document.createElement('textarea');
        textArea.style.width = '100%';
        textArea.style.height = '80vh';
        textArea.style.fontSize = '16px'; // Adjusted font size for readability
        textArea.value = productList.join('\n'); // Fill textarea with current list
        txtPopup.appendChild(textArea);

        // Create Save button
        const saveButton = document.createElement('button');
        saveButton.id = 'save-product-list';
        saveButton.textContent = 'Save List';
        saveButton.style.marginRight = '10px';
        //saveButton.style.borderWidth = '1px';
        //saveButton.style.color = 'black';
        //saveButton.style.background = 'white';
        saveButton.style.marginTop = '10px';
        saveButton.style.padding = '5px 15px';
        saveButton.style.cursor = 'pointer';
        saveButton.addEventListener('click', function() {
            productList = textArea.value.split("\n").map(item => item.trim()).filter(item => item.length > 0);
            GM_setValue('productList', productList); // Save the list
            alert('บันทึกรายการสินค้า!');
            document.body.removeChild(txtPopup); // Close the txtPopup after saving
            displayProductList(); // Update the displayed list
            popup.style.display = 'block';
        });
        txtPopup.appendChild(saveButton);

        // Create Close button
        const closeButton = document.createElement('button');
        closeButton.id = 'close-product-list';
        closeButton.textContent = 'Close';
        //closeButton.style.borderWidth = '1px';
        //closeButton.style.color = 'black';
        //closeButton.style.background = 'white';
        closeButton.style.marginTop = '10px';
        closeButton.style.padding = '5px 15px';
        closeButton.style.cursor = 'pointer';
        closeButton.addEventListener('click', function() {
            document.body.removeChild(txtPopup); // Close the txtPopup without saving
            popup.style.display = 'block';
        });
        txtPopup.appendChild(closeButton);

        // Append the txtPopup to the body
        document.body.appendChild(txtPopup);
    }

    function displayProductList() {
        const optionsList = document.getElementById('options-list');
        optionsList.innerHTML = ""; // Clear existing rows

        productList.forEach(product => {
            const row = document.createElement('tr');

            const productCell = document.createElement('td');
            productCell.textContent = product;

            const amountCell = document.createElement('td');
            const amountInput = document.createElement('input');
            amountInput.style.width = '60px';
            amountInput.type = 'number';
            amountInput.placeholder = 'Amount';
            amountInput.className = 'amount-input';
            amountInput.min = '0';
            amountInput.value = '0';
            amountInput.setAttribute('data-product', product);
            amountInput.addEventListener('input', updateSelectedCount);
            amountCell.appendChild(amountInput);

            const extraCell = document.createElement('td');
            const extraInput = document.createElement('input');
            extraInput.style.width = '60px';
            extraInput.type = 'number';
            extraInput.placeholder = 'Extra';
            extraInput.className = 'extra-input';
            extraInput.min = '0';
            extraInput.value = '0';
            extraInput.setAttribute('data-product', product);
            extraInput.addEventListener('input', updateSelectedCount);
            extraCell.appendChild(extraInput);

            row.appendChild(productCell);
            row.appendChild(amountCell);
            row.appendChild(extraCell);
            optionsList.appendChild(row);
        });
    }

    let productList = GM_getValue('productList', []);
    GM_registerMenuCommand('แก้ไขรายการสินค้า', openTextAreaPopup);

    displayProductList();
    /*
    // Fetch product list from Pastebin and populate UI
    GM_xmlhttpRequest({
        method: "GET",
        url: PRODUCT_URL,
        overrideMimeType: "text/plain; charset=utf-8",
        onload: function (response) {
            let contentType = response.responseHeaders.match(/Content-Type:\s*([^\r\n]+)/i);
            contentType = contentType ? contentType[1] : "";

            if (!contentType.includes("text/plain") && !contentType.includes("text")) {
                console.error("Unexpected content type:", contentType);
                alert("Error: The response is not plain text.");
                return;
            }

            let rawText = response.responseText;
            let productList = rawText
                .replace(/\r\n/g, "\n")
                .split("\n")
                .map(item => item.trim())
                .filter(item => item.length > 0);

            const optionsList = document.getElementById('options-list');
            optionsList.innerHTML = "";

            productList.forEach(product => {
                const row = document.createElement('tr');

                const productCell = document.createElement('td');
                productCell.textContent = product;

                const amountCell = document.createElement('td');
                const amountInput = document.createElement('input');
                amountInput.style.width = '60px';
                amountInput.type = 'number';
                amountInput.placeholder = 'Amount';
                amountInput.className = 'amount-input';
                amountInput.min = '0';
                amountInput.value = '0';
                amountInput.setAttribute('data-product', product);
                amountInput.addEventListener('input', updateSelectedCount);
                amountCell.appendChild(amountInput);

                const extraCell = document.createElement('td');
                const extraInput = document.createElement('input');
                extraInput.style.width = '60px';
                extraInput.type = 'number';
                extraInput.placeholder = 'Extra';
                extraInput.className = 'extra-input';
                extraInput.min = '0';
                extraInput.value = '0';
                extraInput.setAttribute('data-product', product);
                extraInput.addEventListener('input', updateSelectedCount);
                extraCell.appendChild(extraInput);

                row.appendChild(productCell);
                row.appendChild(amountCell);
                row.appendChild(extraCell);
                optionsList.appendChild(row);
            });
        },
        onerror: function (error) {
            console.error('Error fetching product list:', error);
        }
    });*/

    // Function to update selected count
    function updateSelectedCount() {
        const amountInputs = document.querySelectorAll('.amount-input');
        const extraInputs = document.querySelectorAll('.extra-input');

        let selectedCount = 0; // Number of selected items (amount > 0 or extra > 0)
        let rowCount = 0; // Number of rows used (main + extra rows)
        let totalItems = 0; // Total of amount + extra for all selected items

        amountInputs.forEach((amountInput, index) => {
            const amountValue = parseInt(amountInput.value, 10) || 0;
            const extraValue = parseInt(extraInputs[index].value, 10) || 0;

            if (amountValue > 0 || extraValue > 0) {
                selectedCount++; // Count selected items
                totalItems += amountValue + extraValue; // Add to total

                // Count rows:
                // - 1 row for amount > 0
                // - 1 additional row for extra > 0
                if (amountValue > 0) rowCount++;
                if (extraValue > 0) rowCount++;
            }
        });

        // Update the display
        document.getElementById('selected-count').innerText = `สินค้า: ${selectedCount} รายการ | รายการในบิล: ${rowCount} รายการ | ทั้งหมด: ${totalItems} ชิ้น`;
    }
})();
