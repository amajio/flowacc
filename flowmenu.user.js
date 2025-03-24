// ==UserScript==
// @name         Flow Account Menu
// @namespace    http://tampermonkey.net/
// @version      1.331
// @description  Displays a list of products in Flow Account
// @author       AI code
// @match        *.flowaccount.com/*/business/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @updateURL    https://raw.githubusercontent.com/amajio/flowacc/main/flowmenu.user.js
// @downloadURL  https://raw.githubusercontent.com/amajio/flowacc/main/flowmenu.user.js
// ==/UserScript==

'use strict';

// Constants
const PATHS = ['/invoices/', '/billing-notes/', '/quotations/'];
const TIMEOUTS = {
  DROPDOWN: 600,
  ROW_PROCESSING: 700,
  NEXT_ITEM: 200
};

// Styles
GM_addStyle(`
  html {
    font-size: 100%;
  }
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
    font-size: 1em;
  }
  #options-table th {
    background-color: #3CAEDA;
    color: white;
  }
  .amount-input, .extra-input {
    width: 65px;
    padding: 5px;
    box-sizing: border-box;
    border-radius: 5px;
    border: 1px solid #808080;
  }
  .amount-input:focus, .extra-input:focus {
    border: 1px solid #2898CB;
    box-shadow: 0 0 2px #2898CB;
  }
  #controls-container {
    position: sticky;
    bottom: 0;
    background: white;
    padding: 10px 0;
    border-top: 1px solid #ccc;
  }
  #buttons-container {
    position: sticky;
    bottom: 0;
    background: white;
    padding: 20px 0;
    border-top: 1px solid #ccc;
  }
  #selected-count {
    margin-bottom: 10px;
    font-weight: bold;
    font-size: 0.9em;
    color: #333;
  }
  #submit-selections, #clear-amount, #close-popup, #setting-list {
    padding: 10px 30px;
    margin-right: 2px;
    font-size: 1em;
    cursor: pointer;
    color: white;
    border: none;
    border-radius: 5px;
    background-color: #2898CB;
  }

  #submit-selections:hover,#close-popup:hover,#clear-amount:hover,#setting-list:hover {
    background-color: #2887B6;
  }
  #save-product-list, #close-product-list{
    padding: 10px 30px;
    border-radius: 5px;
    font-size: 1em;
    background-color: #2898CB;
    color: white;
    border: none;
    cursor: pointer;
  }
  #save-product-list:hover,#close-product-list:hover {
    background-color: #2887B6;
  }
  #close-popup {
    position: absolute;
    right: 0px;
  }
  #setting-list{
    position: absolute;
    right: 85px;
  }
  #openPopupButton {
    z-index: 99999;
    top: 19px;
    right: 410px;
    position: fixed;
    padding: 10px 30px;
    font-size: 1em;
    cursor: pointer;
    background-color: #88C426;
    color: white;
    border: none;
  }
  #openPopupButton:hover {
    color: white;
    background-color: #74AC18;
  }
  .center{
    height: 30px;
    text-align: center;
    font-size: 1.5em;
    font-weight: bold;
  }
  .highlight-row {
    background-color: #3CAEDA !important;
  }
  .highlight-product {
    font-weight: bold !important;
  }
  .loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.7);
    z-index: 10000;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 1.5em;
    color: #2898CB;
  }
  .notification {
    position: fixed;
    top: 20px;
    left: 50%;
    padding: 10px;
    background: #33b5e5;
    color: white;
    border-radius: 4px;
    z-index: 99999;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  }
  .notification.error {
    left: 50%;
    top: 50%;
    background: #ff4444;
  }
  .notification.success {
    background: #3CAEDA;
  }
  #missing-product{
     font-weight: bold;
     color: red;
     font-size: 1.1em;
  }
`);

// Main function
(function () {
    let productList = GM_getValue('productList', []);
    let lastUrl = location.href;

    // Create the popup
    const popup = document.createElement('div');
    popup.id = 'select-popup';
    popup.style.height = '80vh';
    popup.innerHTML = `
        <div class="center">รายการสินค้า</div>
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
            <div id="selected-count">สินค้าทั้งหมด: 0 รายการ | เลือก: 0 รายการ | แถม: 0 รายการ | ทั้งหมด: 0 ชิ้น</div>
            <button id="submit-selections">ยืนยัน</button>
            <button id="clear-amount">ล้างจำนวน</button>
            <button id="setting-list">ตั้งค่า</button>
            <button id="close-popup">ปิด</button>
        </div>
    `;
    document.body.appendChild(popup);

    // Create open button
    const openPopupButton = document.createElement('button');
    openPopupButton.id = 'openPopupButton';
    openPopupButton.innerText = 'รายการสินค้า';
    openPopupButton.style.borderRadius = '5px';
    document.body.appendChild(openPopupButton);

    // URL change observer
    const observer = new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            onUrlChange();
        }
    });
    observer.observe(document, { subtree: true, childList: true });

    // Event listeners
    openPopupButton.addEventListener('click', () => {
        popup.style.display = 'block';
        updateSelectedCount();
    });

    document.getElementById('setting-list').addEventListener('click', () => {
        popup.style.display = 'none';
        openTextAreaPopup();
    });

    document.getElementById('close-popup').addEventListener('click', () => {
        popup.style.display = 'none';
    });

    document.getElementById('clear-amount').addEventListener('click', () => {
        const amountInputs = document.querySelectorAll('.amount-input');
        const extraInputs = document.querySelectorAll('.extra-input');
        amountInputs.forEach(input => { input.value = 0; });
        extraInputs.forEach(input => { input.value = 0; });
        updateSelectedCount();
        updateRowColors(); // Explicitly update colors after clear
    });

    document.body.addEventListener("input", function(event) {
        if (event.target.matches(".amount-input, .extra-input")) {
            updateSelectedCount();
            updateRowColors(); // Update colors immediately on input
        }
    });

    // Keyboard navigation
    document.addEventListener('keydown', function(event) {
        let inputs = Array.from(document.querySelectorAll('input.amount-input, input.extra-input'));
        let currentIndex = inputs.indexOf(document.activeElement);
        if (currentIndex === -1) return;

        let columnCount = 2;
        let rowCount = inputs.length / columnCount;

        if (event.key === 'ArrowRight' && (currentIndex + 1) % columnCount !== 0) {
            inputs[currentIndex + 1]?.focus();
            event.preventDefault();
        } else if (event.key === 'ArrowLeft' && currentIndex % columnCount !== 0) {
            inputs[currentIndex - 1]?.focus();
            event.preventDefault();
        } else if (event.key === 'ArrowDown' && currentIndex + columnCount < inputs.length) {
            inputs[currentIndex + columnCount]?.focus();
            event.preventDefault();
        } else if (event.key === 'ArrowUp' && currentIndex - columnCount >= 0) {
            inputs[currentIndex - columnCount]?.focus();
            event.preventDefault();
        }

        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
        }
    });

    // Functions
    function onUrlChange() {
        //openPopupButton.style.display = PATHS.some(path => location.href.includes(path)) ? 'block' : 'none';

        if(PATHS.some(path => location.href.includes(path))){
            openPopupButton.style.display = 'block';
            const amountInputs = document.querySelectorAll('.amount-input');
            const extraInputs = document.querySelectorAll('.extra-input');
            amountInputs.forEach(input => { input.value = 0; });
            extraInputs.forEach(input => { input.value = 0; });
            updateSelectedCount();
            updateRowColors(); // Explicitly update colors after clear
        }else{
            openPopupButton.style.display = 'none';
        }
    }

    function showLoading(show) {
        let loader = document.getElementById('loading-overlay');
        if (show) {
            if (!loader) {
                loader = document.createElement('div');
                loader.id = 'loading-overlay';
                loader.className = 'loading-overlay';
                loader.textContent = 'กำลังใส่ข้อมูล...';
                document.body.appendChild(loader);
            }
        } else if (loader) {
            document.body.removeChild(loader);
        }
    }

    function showNotification(message, type = 'info', delay = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => document.body.removeChild(notification), 300);
        }, delay);
    }

    function updateRowColors() {
        const rows = document.querySelectorAll("#options-table tbody tr");
        rows.forEach(row => {
            const amountInput = row.querySelector(".amount-input");
            const extraInput = row.querySelector(".extra-input");
            const productCell = row.querySelector("td:first-child");
            const amount = amountInput ? parseInt(amountInput.value) || 0 : 0;
            const extra = extraInput ? parseInt(extraInput.value) || 0 : 0;

            if (amount > 0 || extra > 0) {
                row.classList.add('highlight-row');
                if (productCell) productCell.classList.add('highlight-product');
            } else {
                row.classList.remove('highlight-row');
                if (productCell) productCell.classList.remove('highlight-product');
            }
        });
    }

    function displayProductList() {
        const optionsList = document.getElementById('options-list');
        optionsList.innerHTML = "";

        if(productList.length > 0){
            productList.forEach(product => {
                if(product.startsWith('//')) return;

                const row = document.createElement('tr');
                const productCell = document.createElement('td');
                productCell.textContent = product;

                const amountCell = document.createElement('td');
                const amountInput = document.createElement('input');
                amountInput.type = 'number';
                amountInput.className = 'amount-input';
                amountInput.min = '0';
                amountInput.value = '0';
                amountInput.setAttribute('data-product', product);

                amountInput.addEventListener('input', function() {
                    updateSelectedCount();
                    updateRowColors(); // Immediate update
                });

                amountInput.addEventListener('focus', function() {
                    if(this.value == 0) this.value = '';
                });

                amountInput.addEventListener('blur', function() {
                    if (this.value.trim() === '') this.value = 0;
                    updateRowColors(); // Update on blur too
                });

                amountCell.appendChild(amountInput);

                const extraCell = document.createElement('td');
                const extraInput = document.createElement('input');
                extraInput.type = 'number';
                extraInput.className = 'extra-input';
                extraInput.min = '0';
                extraInput.value = '0';
                extraInput.setAttribute('data-product', product);

                extraInput.addEventListener('input', function() {
                    updateSelectedCount();
                    updateRowColors(); // Immediate update
                });

                extraInput.addEventListener('focus', function() {
                    if(this.value == 0) this.value = '';
                });

                extraInput.addEventListener('blur', function() {
                    if (this.value.trim() === '') this.value = 0;
                    updateRowColors(); // Update on blur too
                });

                extraCell.appendChild(extraInput);

                row.appendChild(productCell);
                row.appendChild(amountCell);
                row.appendChild(extraCell);
                optionsList.appendChild(row);
            });
            updateSelectedCount();
        }else{
            const row = document.createElement('tr');
            const productCell = document.createElement('td');
            productCell.id = 'missing-product';
            productCell.setAttribute('colspan','3');
            productCell.style.textAlign = 'center';
            productCell.style.whiteSpace = "pre-line";
            productCell.textContent = "ไม่พบรายการสินค้า\nกดปุ่ม ตั้งค่า เพื่อเพิ่มรายการสินค้า";
            row.appendChild(productCell);
            optionsList.appendChild(row);
            updateSelectedCount();
        }
    }

    function updateSelectedCount() {
        const amountInputs = document.querySelectorAll('.amount-input');
        const extraInputs = document.querySelectorAll('.extra-input');
        let selectedCount = 0;
        let rowCount = 0;
        let totalItems = 0;
        let allItems = 0;
        let extraCount = 0;

        amountInputs.forEach((amountInput, index) => {
            const amountValue = parseInt(amountInput.value, 10) || 0;
            const extraValue = parseInt(extraInputs[index].value, 10) || 0;
            allItems++;

            if (amountValue > 0 || extraValue > 0) {
                selectedCount++;
                totalItems += amountValue + extraValue;
                if (amountValue > 0) rowCount++;
                if (extraValue > 0) {
                    rowCount++;
                    extraCount++;
                }
            }
        });

        document.getElementById('selected-count').innerText =
            `สินค้าทั้งหมด: ${allItems} รายการ | เลือก: ${selectedCount} รายการ | แถม: ${extraCount} รายการ | ทั้งหมด: ${totalItems} ชิ้น`;
    }

    function openTextAreaPopup() {
        const txtPopup = document.createElement('div');
        txtPopup.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border: 1px solid #ccc;
            z-index: 99999;
            width: 700px;
            height: 800px;
            overflow: auto;
        `;

        const textArea = document.createElement('textarea');
        textArea.style.cssText = `
            width: 100%;
            height: 85%;
            font-size: 16px;
        `;
        textArea.value = productList.join('\n');
        txtPopup.appendChild(textArea);

        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            justify-content: flex-end;
            margin-top: 10px;
            gap: 10px;
        `;

        const saveButton = document.createElement('button');
        saveButton.id = 'save-product-list';
        saveButton.textContent = 'บันทึกรายการ';
        saveButton.addEventListener('click', function() {
            productList = textArea.value.split("\n").map(item => item.trim()).filter(item => item.length > 0);
            GM_setValue('productList', productList);
            showNotification('บันทึกรายการสินค้าเรียบร้อยแล้ว', 'success');
            document.body.removeChild(txtPopup);
            displayProductList();
            popup.style.display = 'block';
        });

        const closeButton = document.createElement('button');
        closeButton.id = 'close-product-list';
        closeButton.textContent = 'ปิด';
        closeButton.addEventListener('click', function() {
            document.body.removeChild(txtPopup);
            popup.style.display = 'block';
        });

        buttonContainer.appendChild(saveButton);
        buttonContainer.appendChild(closeButton);
        txtPopup.appendChild(buttonContainer);
        document.body.appendChild(txtPopup);
    }

    // Initialize
    displayProductList();
    onUrlChange();
    GM_registerMenuCommand('แก้ไขรายการสินค้า', openTextAreaPopup);
        // Simulate typing function
    function simulateTyping(inputElement, value) {
        const event = new Event('input', { 'bubbles': true, 'cancelable': true });
        inputElement.value = value;
        inputElement.dispatchEvent(event);
        inputElement.blur();
    }

    // Simulate clicking function
    function simulateClick(inputElement) {
        const clickEvent = new MouseEvent('click', { 'bubbles': true, 'cancelable': true });
        inputElement.dispatchEvent(clickEvent);
    }

    // Select first dropdown option
    function selectFirstDropdownOption(inputElement) {
        simulateClick(inputElement);
        setTimeout(() => {
            const dropdownOptions = inputElement.closest('typeahead-custom').querySelectorAll('.tt-suggestion');
            if (dropdownOptions.length > 0) {
                dropdownOptions[0].click();
            }
        }, 600);
    }

    // Process selected products
    document.getElementById('submit-selections').addEventListener('click', () => {
        try {
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
                showNotification('กรุณาระบุจำนวน', 'error', 1000);
                return;
            }
            showLoading(true);

            popup.style.display = 'None';
            let inputIndex = 1;
            let selectedProductIndex = 0;

            function processNextInput() {
                if (selectedProductIndex >= selectedProducts.length) {
                    showLoading(false);
                    showNotification('ใส่ข้อมูลเสร็จสิ้น', 'success');
                    return;
                }

                const selectedProduct = selectedProducts[selectedProductIndex];

                // Skip if amount = 0 and extra = 0
                if (selectedProduct.amount === 0 && selectedProduct.extra === 0) {
                    selectedProductIndex++;
                    setTimeout(processNextInput, TIMEOUTS.NEXT_ITEM);
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
                    setTimeout(processNextInput, TIMEOUTS.NEXT_ITEM);
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
                    setTimeout(processNextInput, TIMEOUTS.ROW_PROCESSING);
                } else {
                    showLoading(false);
                    showNotification("ไม่พบปุ่มเพิ่มรายการ!", 'error');
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
                        setTimeout(processNextInput, TIMEOUTS.NEXT_ITEM);
                    }
                }, TIMEOUTS.ROW_PROCESSING);
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
                    setTimeout(processNextInput, TIMEOUTS.NEXT_ITEM);
                }, TIMEOUTS.ROW_PROCESSING);
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
                                setTimeout(processNextInput, TIMEOUTS.NEXT_ITEM);
                            }, TIMEOUTS.ROW_PROCESSING);
                        }
                    }, TIMEOUTS.ROW_PROCESSING);
                }, TIMEOUTS.ROW_PROCESSING);
            }

            processNextInput();
        } catch (error) {
            showLoading(false);
            showNotification(`เกิดข้อผิดพลาด: ${error.message}`, 'error');
            console.error('Error processing products:', error);
        }
    });

    // Initialize product list display
    displayProductList();
    onUrlChange();
})();
