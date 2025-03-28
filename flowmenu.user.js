// ==UserScript==
// @name         Flow Account Menu
// @namespace    http://tampermonkey.net/
// @version      1.61
// @description  Automatically populate data into Invoice, Billing Note, and Quotations.
// @author       AI code
// @match        *.flowaccount.com/*/business/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @updateURL    https://raw.githubusercontent.com/amajio/flowacc/main/flowmenu.user.js
// @downloadURL  https://raw.githubusercontent.com/amajio/flowacc/main/flowmenu.user.js
// ==/UserScript==

'use strict';

class FlowAccountMenu {
    constructor() {
        this.PATHS = ['/invoices/', '/billing-notes/', '/quotations/'];
        this.DEFAULT_TIMEOUTS = {
            DROPDOWN: 600,
            ROW_PROCESSING: 700,
            NEXT_ITEM: 100,
        };
        this.TIMEOUTS = {
            DROPDOWN: GM_getValue('dropdownTimeout', this.DEFAULT_TIMEOUTS.DROPDOWN),
            ROW_PROCESSING: GM_getValue('rowProcessingTimeout', this.DEFAULT_TIMEOUTS.ROW_PROCESSING),
            NEXT_ITEM: GM_getValue('nextItemTimeout', this.DEFAULT_TIMEOUTS.NEXT_ITEM),
        };
        this.productList = GM_getValue('productList', []);
        this.lastUrl = location.href;

        this.buttonOpen = {
            targetXPath: '//*[@id="documentHeader"]/div/div[2]',
            buttonId: 'openAppButton',
            buttonText: 'รายการสินค้า'
        };

        this.buttonColor = {
            default: '',
            primary:'',
            success: '',
            info: '',
            warning: '',
            danger: ''
        };

        this.initStyles();
        this.initApplication();
        this.initOpenButton();
        this.setupObservers();
        this.registerMenuCommands();
        this.displayProductList();
    }

    initStyles() {
        GM_addStyle(`

/*--------------------*/
/*      MAIN PAGE     */
/*--------------------*/

            html { font-size: 100%; }
            #app-container {
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
                overflow: hidden;
            }
            #product-list-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 18%;
            }
            #product-list-table th, #product-list-table td {
                padding: 8px;
                border-bottom: 1px solid #ddd;
                font-size: 1em;
            }
            #product-list-table thead {
                position: sticky;
                top: 0;
                background-color: white;
                z-index: 10;
            }
            #product-list-table th {
                background-color: #3CAEDA;
                color: white;
                text-align: center;
                padding: 10px;
                border-bottom: 2px solid #ddd;
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
                padding: 10px;
                border-top: 1px solid #ccc;
                display: flex;
                flex-direction: column;
                align-items: center;
                width: 100%;
                text-align: left;
            }

            .button-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                width: 100%;
            }
            .button-group {
                display: flex;
                gap: 10px;
            }
            #selected-count {
                width: 100%;
                font-size: 0.9em;
                font-weight: bold;
                color: #333;
                padding-bottom: 5px;
            }
            .main-menu-button {
                padding: 9px 20px;
                font-size: 1em;
                cursor: pointer;
                color: white;
                border: none;
                border-radius: 5px;
                background-color: #2898CB;
                transition: all 0.2s ease;
            }
            .main-menu-button:hover {
                background-color: #2887B6;
                transform: translateY(-1px);
            }

            #openAppButton {
                z-index: 99999;
                margin-left: 8px;
                padding: 10px 30px;
                background-color: #88C426;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 1em;
                transition: all 0.3s;
            }
            #openAppButton:hover {
                color: white;
                background-color: #74AC18;
                transform: translateY(-1px);
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
            .highlight-product,.highlight-number {
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
                z-index: 100000;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            }
            .notification.error {
                position: fixed;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                background: #ff4444;
                color: white;
                padding: 10px 20px;
                border-radius: 5px;
                font-size: 16px;
                z-index: 100000;
                opacity: 1;
                transition: opacity 0.3s ease-in-out;
            }
            .notification.success {
                background: #5CB85C;
                top: 5%;
                transform: translate(-50%, -50%);
            }

            #empty-product{
                font-weight: bold;
                color: red;
                font-size: 1.1em;
            }
            .list-number{
                text-align: center;
            }
            .dropdown {
                position: relative;
                display: inline-block;
            }
            .dropdown-content {
                display: none;
                position: absolute;
                bottom: 100%;
                right: 0;
                background-color: #f9f9f9;
                min-width: 160px;
                box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
                z-index: 1;
                border-radius: 5px;
            }
            .dropdown-content a {
                color: black;
                padding: 12px 16px;
                text-decoration: none;
                display: block;
                cursor: pointer;
                border-radius: 5px;
            }
            .dropdown-content a:hover {
                background-color: #2898CB;
                color: white;
            }
            .dropdown:hover .dropdown-content {
                display: block;
            }

            #menu-delay-settings:before{
                content: "⏱ ";
                font-size: 1.3em;
            }

            #menu-add-product:before{
                content: "📄 ";
                font-size: 1.1em;
            }

            #close-popup:before{
                content: "✖ ";
                font-size: 1.2em;
            }

            #setting-list:before {
                content: "🛠 ";
                font-size: 1.3em;
            }

            #submit-selections:before{
                content: "✔ ";
                font-size: 1.2em;
            }
            #clear-amount:before{
                content: "↻ ";
                font-size: 1.35em;
            }
            #app-container {
				display: none;
				opacity: 0;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%) translateY(-20px);
				transition: opacity 0.25s ease, transform 0.3s ease;
			}

			#app-container.visible {
				display: block;
				opacity: 1;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%) translateY(0);
			}
            #search-box{
               border-radius: 5px;
               border: 1px solid #808080;
               padding: 5px 5px;
            }
            #search-box:focus{
               border: 1px solid #2898CB;
               box-shadow: 0 0 2px #2898CB;
            }

/*--------------------*/
/*     LOGO HEADER    */
/*--------------------*/

            #imgHeader{
               display: inline-block;
               float:left;
            }
            #imgHeader img{
               width: 250px;
            }

/*---------------------*/
/* OVERLAY BLACKGROUND */
/*---------------------*/

            .overlay {
               position: fixed;
               top: 0;
               left: 0;
               width: 100%;
               height: 100%;
               background-color: rgba(0,0,0,0);
               z-index: 99999;
               display: flex;
               align-items: center;
               justify-content: center;
               opacity: 0;
               pointer-events: none;
               transition: opacity 0.3s ease-out, background-color 0.3s ease-out;
               backdrop-filter: blur(0px);
            }
            .overlay.active {
                background-color: rgba(0,0,0,0.7);
                opacity: 1;
                pointer-events: all;
                backdrop-filter: blur(5px);
            }
            .overlay.active .setting-product-container {
                transform: translateY(0);
                opacity: 1;
            }
            .overlay.active .timeout-container {
                transform: translateY(0);
                opacity: 1;
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

/*-----------------*/
/* SETTING PRODUCT */
/*-----------------*/

            .setting-product-container {
                background-color: #ffffff;
                padding: 2rem;
                border-radius: 12px;
                width: min(90vw, 800px);
                max-height: 90vh;
                text-align: center;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
                display: flex;
                flex-direction: column;
                border: 1px solid rgba(255, 255, 255, 0.2);
                transform: translateY(20px);
                opacity: 0;
                transition: all 0.3s ease-out 0.1s;
            }

            .setting-product-textarea {
                width: 100%;
                height: 65vh;
                font-size: 14px;
                margin-bottom: 1.5rem;
                padding: 1rem;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                resize: none;
                line-height: 1.5;
                background: #white;
                color: black;
                transition: all 0.2s ease;
                box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);
            }
            .setting-product-textarea:focus {
                outline: none;
                border-color: #2898CB;
                box-shadow: 0 0 0 2px rgba(40, 152, 203, 0.2);
            }
            .setting-product-button-container {
                display: flex;
                justify-content: flex-end;
                gap: 12px;
            }
            .setting-product-button {
                padding: 0.75rem 1.75rem;
                border-radius: 8px;
                font-size: 0.95rem;
                font-weight: 500;
                border: none;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .button-primary {
                background-color: #2898CB;
                color: white;
            }
            .button-secondary {
                background-color: #2898CB;
                color: white;
            }

            .button-primary:hover {
                background-color: #1e7ba8;
                transform: translateY(-1px);
            }

            .button-secondary:hover {
                background-color: #1e7ba8;
                transform: translateY(-1px);
            }

            .setting-product-button:active {
                transform: translateY(0);
            }
		    .button-primary:before{
		    	content: "🖫 ";
		    	font-size: 1.3em;
		    }
		    #product-edit:before{
		    	content: "✎ ";
		    	font-size: 1.2em;
		    }
		    .button-secondary:before{
		    	content: "✖ ";
		    	font-size: 1.2em;
		    }
            #txt-header{
               font-size: 2em;
               text-align: center;
               vertical-align: middle;
               line-height: 50px;
               background-color: #2898CB;
               color: white;
               height: 50px;
               margin-bottom: 5px;
            }
            .text-disabled {
                background-color: #f9f9f9;
                color: grey;
                cursor: not-allowed;
                overflow: hidden;
            }

/*-----------------*/
/* SETTING TIMEOUT */
/*-----------------*/

            #timeout-save:before {
                content: "🖫 ";
                font-size: 1.3em;
            }
            #timeout-cancel:before {
                content: "✖ ";
                font-size: 1.3em;
            }
            #timeout-reset:before {
                content: "↻ ";
                font-size: 1.35em;
            }
            .timeout-container {
                background-color: #fff;
                padding: 30px;
                border-radius: 10px;
                max-width: 500px;
                width: 100%;
                text-align: center;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                transform: translateY(20px);
                opacity: 0;
                transition: all 0.3s ease-out 0.1s;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            .timeout-title {
                margin-bottom: 20px;
                font-size: 24px;
                color: #333;
            }
            .timeout-input-container {
                width: 100%;
                margin-bottom: 15px;
            }
            .timeout-label {
                display: block;
                margin-bottom: 5px;
                font-size: 16px;
                color: #555;
            }
            .timeout-input {
                padding: 10px;
                width: 80%;
                font-size: 16px;
                border: 1px solid #ddd;
                border-radius: 5px;
                box-sizing: border-box;
                margin-bottom: 10px;
                transition: all 0.2s ease;
                text-align: center;
            }
            .timeout-input:focus {
                outline: none;
                border-color: #3CAEDA;
                box-shadow: 0 0 0 2px rgba(60, 174, 218, 0.2);
            }
            .timeout-button-container {
                margin-top: 20px;
                display: flex;
                justify-content: center;
                gap: 20px;
            }
            .timeout-button {
                padding: 10px 25px;
                font-size: 1em;
                background-color: #3CAEDA;
                color: #fff;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            .timeout-button:hover {
                background-color: #2887B6;
                transform: translateY(-1px);
            }
            .timeout-button:active {
                transform: translateY(0);
            }
        `);
    }

    initApplication() {
        this.app = document.createElement('div');
        this.app.id = 'app-container';
        this.app.style.height = '85vh';
        this.app.innerHTML = `
          <div style="text-align: right; margin-bottom: 10px;">
              <div id="imgHeader"><img src="https://flowaccountcdn.com/new_landing/image/flowaccount_logo_banner.svg"></img></div>
              <input type="text" id="search-box" placeholder="ค้นหา" onkeyup="filterTable() onclick="this.select()" />
          </div>
          <div style="max-height: 75vh; overflow-y: auto;">
            <table id="product-list-table">
                <thead>
                    <tr>
                        <th>ลำดับ</th>
                        <th>สินค้า</th>
                        <th>จำนวน</th>
                        <th>แถม</th>
                    </tr>
                </thead>
                <tbody id="options-list"></tbody>
            </table>
          </div>
          <div id="controls-container">
              <!-- Selected count on top -->
              <div id="selected-count">สินค้าทั้งหมด: 0 รายการ | ขาย: 0 รายการ | แถม: 0 รายการ | ทั้งหมด: 0 ชิ้น</div>
              <!-- Button row below -->
              <div class="button-row">
                  <!-- Left buttons -->
                  <div class="button-group">
                      <button class="main-menu-button" id="submit-selections">ยืนยัน</button>
                      <button class="main-menu-button" id="clear-amount">ล้างจำนวน</button>
                  </div>
                  <!-- Right buttons -->
                  <div class="button-group">
                      <div class="dropdown">
                          <button class="main-menu-button" id="setting-list">ตั้งค่า</button>
                          <div class="dropdown-content">
                              <a id="menu-delay-settings">ตั้งค่าหน่วงเวลา</a>
                              <a id="menu-add-product">รายการสินค้า</a>
                          </div>
                      </div>
                      <button class="main-menu-button" id="close-app">ปิด</button>
                  </div>
              </div>
          </div>
        `;
        document.body.appendChild(this.app);

        document.getElementById('search-box').addEventListener('keyup', this.filterTable);

        document.getElementById('search-box').onclick = function() {
            this.select();
        };

        document.getElementById('close-app').addEventListener('click', () => {
            this.hide();
        });

        document.getElementById('clear-amount').addEventListener('click', () => {
            this.clearAmountInputs();
        });

        document.getElementById('submit-selections').addEventListener('click', () => {
            this.processSelectedProducts();
        });

        document.getElementById('menu-add-product')?.addEventListener('click', () => {
            this.hide();
            this.settingProduct();
        });

        document.getElementById('menu-delay-settings')?.addEventListener('click', () => {
            this.settingTimeout();
            this.hide();
        });

        document.body.addEventListener("input", (event) => {
            if (event.target.matches(".amount-input, .extra-input")) {
                this.updateSelectedCount();
                this.updateRowColors();
            }
        }, true);

        document.body.addEventListener("focus", (event) => {
            if (event.target.matches(".amount-input, .extra-input") && event.target instanceof HTMLInputElement) {
                // Clear value if it's exactly 0
                if (parseFloat(event.target.value) === 0) {
                    event.target.value = '';
                }
                // Select text if value > 0
                else if (parseFloat(event.target.value) > 0) {
                    event.target.select();
                }
            }
        }, true);

        document.body.addEventListener("blur", (event) => {
            if (event.target.matches(".amount-input, .extra-input")) {
                if (event.target.value.trim() === '') event.target.value = 0;
                this.updateRowColors();
            }
        }, true);

        document.addEventListener('keydown', (event) => {
            const inputs = Array.from(document.querySelectorAll('input.amount-input, input.extra-input'));
            const currentIndex = inputs.indexOf(document.activeElement);
            if (currentIndex === -1) return;

            const columnCount = 2;

            switch(event.key) {
                case 'ArrowRight':
                    if ((currentIndex + 1) % columnCount !== 0) {
                        inputs[currentIndex + 1]?.focus();
                        event.preventDefault();
                    }
                    break;
                case 'ArrowLeft':
                    if (currentIndex % columnCount !== 0) {
                        inputs[currentIndex - 1]?.focus();
                        event.preventDefault();
                    }
                    break;
                case 'ArrowDown':
                    if (currentIndex + columnCount < inputs.length) {
                        inputs[currentIndex + columnCount]?.focus();
                        event.preventDefault();
                    }
                    break;
                case 'ArrowUp':
                    if (currentIndex - columnCount >= 0) {
                        inputs[currentIndex - columnCount]?.focus();
                        event.preventDefault();
                    }
                    break;
            }
        });
    }

    filterTable() {
        const searchQuery = document.getElementById('search-box').value.toLowerCase();
        const searchParts = searchQuery.split(' ').filter(part => part.trim() !== ''); // Split search by space and filter out empty parts
        const rows = document.querySelectorAll('#product-list-table tbody tr');
        let rowNumber = 1; // Start the row number from 1

        rows.forEach(row => {
            const cells = row.querySelectorAll('td');

            // Get the value from the "สินค้า" column (2nd column, product name + quantity)
            const productName = cells[1] ? cells[1].textContent.toLowerCase() : '';

            // Check if all search terms match the full product name (สินค้า)
            const matches = searchParts.every(part => productName.includes(part));

            if (matches) {
                row.style.display = ''; // Show the row
                cells[0].textContent = rowNumber; // Update the "ลำดับ" (first column)
                rowNumber++; // Increment the row number for the next visible row
            } else {
                row.style.display = 'none'; // Hide the row
            }
        });
    }


    clearSearch(){
        document.getElementById('search-box').value = '';
        this.filterTable();
    }

    show() {
        this.app.style.display = 'block';
        setTimeout(() => {
            this.app.classList.add('visible');
        }, 10);
    }

    hide() {
        this.app.classList.remove('visible');
        setTimeout(() => {
            this.app.style.display = 'none';
        }, 500);
    }

    initOpenButton() {
        // Create the button element
        this.openAppButton = document.createElement('button');
        this.openAppButton.id = this.buttonOpen.buttonId;
        this.openAppButton.innerText = this.buttonOpen.buttonText;

            // Add click handler
        this.openAppButton.addEventListener('click', () => {
            if (this.app) {
                this.show();
                this.updateSelectedCount();
            }
        });

        this.injectButtonWithRetry();
    }

    injectButtonWithRetry(attempt = 0) {
        const maxAttempts = 5;
        const retryDelay = 1000;

        const target = document.evaluate(
            this.buttonOpen.targetXPath,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
        ).singleNodeValue;

        if (target) {
            // Check if button does not exist
            if (!document.getElementById(this.buttonOpen.buttonId)) {
                target.insertBefore(this.openAppButton,target.firstChild);
                this.openAppButton.style.display = 'inline-block';
            }
        } else if (attempt < maxAttempts) {
            setTimeout(() => this.injectButtonWithRetry(attempt + 1), retryDelay);
        }
    }

    setupObservers() {
        const observer = new MutationObserver((mutations) => {

            if (!document.getElementById(this.buttonOpen.buttonId) && this.openAppButton) {
                this.injectButtonWithRetry();
                this.includeURL();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    includeURL() {
        if (location.href !== this.lastUrl){
            this.lastUrl = location.href;
            if(this.PATHS.some(path => location.href.includes(path))) {
                this.clearAmountInputs();
                this.clearSearch();
            } else {
              if(this.openAppButton.style.display !== 'none') this.openAppButton.style.display = 'none';
            }
        }
    }

    registerMenuCommands() {
        GM_registerMenuCommand('แก้ไขรายการสินค้า', () => this.settingProduct());
        GM_registerMenuCommand('ตั้งค่าหน่วงเวลาคำสั่ง', () => this.settingTimeout());
    }

    clearAmountInputs() {
        const amountInputs = document.querySelectorAll('.amount-input');
        const extraInputs = document.querySelectorAll('.extra-input');
        amountInputs.forEach(input => { input.value = 0; });
        extraInputs.forEach(input => { input.value = 0; });
        this.updateSelectedCount();
        this.updateRowColors();
    }

    showLoading(show, message = 'กำลังประมวลผล...') {
        let loader = document.getElementById('loading-overlay');

        if (show) {
            if (!loader) {
                loader = document.createElement('div');
                loader.id = 'loading-overlay';
                loader.className = 'loading-overlay';
                document.body.appendChild(loader);
            }
            loader.textContent = message;
            loader.style.display = 'flex';

            return (newMessage) => {
                if (loader) {
                    loader.textContent = newMessage;
                }
            };
        }
        else if (loader) {
            document.body.removeChild(loader);
        }

        return () => {};
    }

    showNotification(message, type = 'info', delay = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => document.body.removeChild(notification), 300);
        }, delay);
    }

    updateRowColors() {
        const rows = document.querySelectorAll("#product-list-table tbody tr");
        rows.forEach(row => {
            const amountInput = row.querySelector(".amount-input");
            const extraInput = row.querySelector(".extra-input");
            const numberCell = row.querySelector("td:first-child");
            const productCell = row.querySelector("td:nth-child(2)");
            const amount = amountInput ? parseInt(amountInput.value) || 0 : 0;
            const extra = extraInput ? parseInt(extraInput.value) || 0 : 0;

            if (amount > 0 || extra > 0) {
                row.classList.add('highlight-row');
                if (numberCell) numberCell.classList.add('highlight-number');
                if (productCell) productCell.classList.add('highlight-product');
            } else {
                row.classList.remove('highlight-row');
                if (numberCell) numberCell.classList.remove('highlight-number');
                if (productCell) productCell.classList.remove('highlight-product');
            }
        });
    }

    displayProductList() {
        const optionsList = document.getElementById('options-list');
        optionsList.innerHTML = "";

        if(this.productList.length > 0) {
            this.productList.forEach((product, index) => {
                if(product.startsWith('//')) return;

                const row = document.createElement('tr');
                const number = document.createElement('td');
                number.className = 'list-number';
                number.textContent = index + 1;
                const productCell = document.createElement('td');
                productCell.textContent = product;

                const amountCell = document.createElement('td');
                const amountInput = document.createElement('input');
                amountInput.type = 'number';
                amountInput.className = 'amount-input';
                amountInput.min = '0';
                amountInput.value = '0';
                amountInput.setAttribute('data-product', product);
                amountCell.appendChild(amountInput);

                const extraCell = document.createElement('td');
                const extraInput = document.createElement('input');
                extraInput.type = 'number';
                extraInput.className = 'extra-input';
                extraInput.min = '0';
                extraInput.value = '0';
                extraInput.setAttribute('data-product', product);
                extraCell.appendChild(extraInput);

                row.appendChild(number);
                row.appendChild(productCell);
                row.appendChild(amountCell);
                row.appendChild(extraCell);
                optionsList.appendChild(row);
            });
            this.updateSelectedCount();
        } else {
            const row = document.createElement('tr');
            const emptyProduct = document.createElement('td');
            emptyProduct.id = 'empty-product';
            emptyProduct.setAttribute('colspan','4');
            emptyProduct.style.textAlign = 'center';
            emptyProduct.style.whiteSpace = "pre-line";
            emptyProduct.textContent = "ไม่พบรายการสินค้า\nกดปุ่ม ตั้งค่า เพื่อเพิ่มรายการสินค้า";
            row.appendChild(emptyProduct);
            optionsList.appendChild(row);
            this.updateSelectedCount();
        }
    }

    updateSelectedCount() {
        const amountInputs = document.querySelectorAll('.amount-input');
        const extraInputs = document.querySelectorAll('.extra-input');
        let saleCount = 0;
        let totalItems = 0;
        let allItems = 0;
        let extraCount = 0;

        amountInputs.forEach((amountInput, index) => {
            const amountValue = parseInt(amountInput.value, 10) || 0;
            const extraValue = parseInt(extraInputs[index].value, 10) || 0;
            allItems++;

            if (amountValue > 0 || extraValue > 0) {
                totalItems += amountValue + extraValue;
                if (extraValue > 0) {
                    extraCount++;
                }
                if (amountValue > 0) {
                    saleCount++;
                }
            }
        });

        document.getElementById('selected-count').innerText =
            `สินค้าทั้งหมด: ${allItems} รายการ | ขาย: ${saleCount} รายการ | แถม: ${extraCount} รายการ | ทั้งหมด: ${totalItems} ชิ้น`;
    }

    settingProduct() {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        document.body.appendChild(overlay);

        // Create container
        const container = document.createElement('div');
        container.className = 'setting-product-container';
        overlay.appendChild(container);

        const txtHeader = document.createElement('div');
        txtHeader.id = 'txt-header';
        txtHeader.innerHTML = 'รายการสินค้า';
        container.appendChild(txtHeader);

        // Create textarea
        const textArea = document.createElement('textarea');
        textArea.className = 'setting-product-textarea text-disabled';
        textArea.value = this.productList.join('\n');
        textArea.placeholder = "ใส่รายการสินค้า, บรรทัดละ 1 รายการ...";
        textArea.disabled = true;
        container.appendChild(textArea);

        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'setting-product-button-container';

        const closeOverlay = () => {
            overlay.classList.remove('active');
            setTimeout(() => {
                overlay.remove();
                this.show();
            }, 200); // Match the transition duration
        };

        // Create save button
        const saveButton = document.createElement('button');
        saveButton.className = 'setting-product-button button-primary';
        saveButton.textContent = 'บันทึก';
        saveButton.addEventListener('click', () => {
            this.productList = textArea.value.split("\n").map(item => item.trim()).filter(item => item.length > 0);
            GM_setValue('productList', this.productList);
            this.showNotification('บันทึกเรียบร้อยแล้ว', 'success');
            this.displayProductList();
            closeOverlay();
        });

        const editButton = document.createElement('button');
        editButton.className = 'setting-product-button button-primary';
        editButton.id = 'product-edit';
        editButton.textContent = 'แก้ไข';
        editButton.addEventListener('click', () => {
            textArea.disabled = false;
            textArea.classList.remove("text-disabled");
        });

        const closeButton = document.createElement('button');
        closeButton.className = 'setting-product-button button-secondary';
        closeButton.textContent = 'ยกเลิก';
        closeButton.addEventListener('click', closeOverlay);

        buttonContainer.appendChild(saveButton);
        buttonContainer.appendChild(editButton);
        buttonContainer.appendChild(closeButton);
        container.appendChild(buttonContainer);
        this.hide();

        // Focus textarea
        setTimeout(() => textArea.focus(), 100);

        setTimeout(() => {
            overlay.classList.add('active');
        }, 10);
    }

    simulateTyping(inputElement, value) {
        const event = new Event('input', { 'bubbles': true, 'cancelable': true });
        inputElement.value = value;
        inputElement.dispatchEvent(event);
        inputElement.blur();
    }

    simulateClick(inputElement) {
        const clickEvent = new MouseEvent('click', { 'bubbles': true, 'cancelable': true });
        inputElement.dispatchEvent(clickEvent);
    }

    selectFirstDropdownOption(inputElement) {
        this.simulateClick(inputElement);
        setTimeout(() => {
            const dropdownOptions = inputElement.closest('typeahead-custom').querySelectorAll('.tt-suggestion');
            if (dropdownOptions.length > 0) {
                dropdownOptions[0].click();
            }
        }, this.TIMEOUTS.DROPDOWN);
    }

    processSelectedProducts() {
        try {
            const selectedProducts = [];
            let totalProcessItems = 0;
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
                    if(amountValue > 0) totalProcessItems++;
                    if(extraValue > 0) totalProcessItems++;
                }
            });

            if (selectedProducts.length === 0) {
                this.showNotification('ระบุจำนวนสินค้า', 'error', 1200);
                return;
            }

            this.clearSearch();
            this.hide();
            let inputIndex = 1;
            let itemInProcess = 1;
            let selectedProductIndex = 0;
            const updateLoader = this.showLoading(true, `กำลังประมวลผล ${itemInProcess} / ${totalProcessItems} รายการ`);

            // Main processing function (keep as inner function to maintain closure)
            const processNextInput = () => {
                if (selectedProductIndex >= selectedProducts.length) {
                    this.showLoading(false);
                    this.showNotification('ใส่ข้อมูลเสร็จสิ้น', 'success');
                    return;
                }

                const selectedProduct = selectedProducts[selectedProductIndex];

                if (selectedProduct.amount === 0 && selectedProduct.extra === 0) {
                    selectedProductIndex++;
                    setTimeout(processNextInput, this.TIMEOUTS.NEXT_ITEM);
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
                    if (addButton) {
                        addButton.click();
                        setTimeout(processNextInput, this.TIMEOUTS.ROW_PROCESSING);
                    } else {
                        this.showLoading(false);
                        this.showNotification("ไม่พบปุ่มเพิ่มรายการ!", 'error');
                    }
                    return;
                }

                if (productInput.value.trim() !== "") {
                    inputIndex++;
                    setTimeout(processNextInput, this.TIMEOUTS.NEXT_ITEM);
                    return;
                }

                // Process main product amount if > 0
                if (selectedProduct.amount > 0) {
                    this.simulateTyping(productInput, selectedProduct.product);
                    this.selectFirstDropdownOption(productInput);
                    updateLoader(`กำลังประมวลผล ${itemInProcess++} / ${totalProcessItems} รายการ`);

                    setTimeout(() => {
                        if (amountInput) {
                            this.simulateTyping(amountInput, selectedProduct.amount);
                            amountInput.focus();
                            const changeEvent = new Event('change', { bubbles: true, cancelable: true });
                            amountInput.dispatchEvent(changeEvent);
                        }

                        // If there's extra, add a new row after processing main amount
                        if (selectedProduct.extra > 0) {
                            setTimeout(() => {
                                if (addButton) {
                                    addButton.click();
                                }

                                inputIndex++;

                                setTimeout(() => {
                                    const newRowXPath = `//*[@id="not-batch-document-table"]/flowaccount-product-item-table/table/tbody/tr[${inputIndex}]`;
                                    const newProductInput = document.evaluate(`${newRowXPath}/td[3]/typeahead-custom/div/div[1]/span/input`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                                    const newAmountInput = document.evaluate(`${newRowXPath}/td[4]/input`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                                    const newPriceInput = document.evaluate(`${newRowXPath}/td[6]/input`, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

                                    if (newProductInput && newAmountInput && newPriceInput) {
                                        this.simulateTyping(newProductInput, selectedProduct.product);
                                        this.selectFirstDropdownOption(newProductInput);
                                        updateLoader(`กำลังประมวลผล ${itemInProcess++} / ${totalProcessItems} รายการ`);

                                        setTimeout(() => {
                                            this.simulateTyping(newAmountInput, selectedProduct.extra);
                                            newAmountInput.focus();
                                            const changeEvent = new Event('change', { bubbles: true, cancelable: true });
                                            newAmountInput.dispatchEvent(changeEvent);

                                            this.simulateTyping(newPriceInput, 0);
                                            newPriceInput.focus();
                                            const priceChangeEvent = new Event('change', { bubbles: true, cancelable: true });
                                            newPriceInput.dispatchEvent(priceChangeEvent);

                                            selectedProductIndex++;
                                            setTimeout(processNextInput, this.TIMEOUTS.NEXT_ITEM);
                                        }, this.TIMEOUTS.ROW_PROCESSING);
                                    }
                                }, this.TIMEOUTS.ROW_PROCESSING);
                            }, this.TIMEOUTS.ROW_PROCESSING);
                        } else {
                            selectedProductIndex++;
                            setTimeout(processNextInput, this.TIMEOUTS.NEXT_ITEM);
                        }
                    }, this.TIMEOUTS.ROW_PROCESSING);
                }
                // Process only extra if amount is 0 but extra > 0
                else if (selectedProduct.extra > 0) {
                    this.simulateTyping(productInput, selectedProduct.product);
                    this.selectFirstDropdownOption(productInput);
                    updateLoader(`กำลังประมวลผล ${itemInProcess++} / ${totalProcessItems} รายการ`);

                    setTimeout(() => {
                        if (amountInput) {
                            this.simulateTyping(amountInput, selectedProduct.extra);
                            amountInput.focus();
                            const changeEvent = new Event('change', { bubbles: true, cancelable: true });
                            amountInput.dispatchEvent(changeEvent);
                        }

                        if (priceInput) {
                            this.simulateTyping(priceInput, 0);
                            priceInput.focus();
                            const priceChangeEvent = new Event('change', { bubbles: true, cancelable: true });
                            priceInput.dispatchEvent(priceChangeEvent);
                        }

                        selectedProductIndex++;
                        setTimeout(processNextInput, this.TIMEOUTS.NEXT_ITEM);
                    }, this.TIMEOUTS.ROW_PROCESSING);
                }
            };

            processNextInput();
        } catch (error) {
            this.showLoading(false);
            this.showNotification(`เกิดข้อผิดพลาด: ${error.message}`, 'error');
            console.error('Error processing products:', error);
        }
    }

    settingTimeout() {
        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        document.body.appendChild(overlay);

        const container = document.createElement('div');
        container.className = 'timeout-container';
        overlay.appendChild(container);

        const title = document.createElement('h3');
        title.className = 'timeout-title';
        title.innerText = 'ตั้งค่าหน่วงเวลา';
        container.appendChild(title);

        const createInput = (label, value, name) => {
            const inputContainer = document.createElement('div');
            inputContainer.className = 'timeout-input-container';
            container.appendChild(inputContainer);

            const labelEl = document.createElement('label');
            labelEl.className = 'timeout-label';
            labelEl.innerText = label;
            inputContainer.appendChild(labelEl);

            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'timeout-input';
            input.value = value;
            input.name = name;

            input.addEventListener('input', () => {
                this.TIMEOUTS[name] = input.value;
            });

            inputContainer.appendChild(input);
        };

        createInput('เวลา เลือกรายการ (มิลลิวินาที)', this.TIMEOUTS.DROPDOWN, 'DROPDOWN');
        createInput('เวลา ใส่จำนวน (มิลลิวินาที)', this.TIMEOUTS.ROW_PROCESSING, 'ROW_PROCESSING');
        createInput('เวลา เริ่มรายการถัดไป (มิลลิวินาที)', this.TIMEOUTS.NEXT_ITEM, 'NEXT_ITEM');

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'timeout-button-container';
        container.appendChild(buttonContainer);

        const saveButton = document.createElement('button');
        saveButton.id = 'timeout-save';
        saveButton.className = 'timeout-button';
        saveButton.innerText = 'บันทึก';

        const resetButton = document.createElement('button');
        resetButton.id = 'timeout-reset';
        resetButton.className = 'timeout-button';
        resetButton.innerText = 'คืนค่าเริ่มต้น';

        const cancelButton = document.createElement('button');
        cancelButton.id = 'timeout-cancel';
        cancelButton.className = 'timeout-button';
        cancelButton.innerText = 'ยกเลิก';

        const closeOverlay = () => {
            overlay.classList.remove('active');
            setTimeout(() => {
                overlay.remove();
                this.show();
            }, 200);
        };

        saveButton.addEventListener('click', () => {
            let dropdown = parseInt(this.TIMEOUTS.DROPDOWN);
            let rowProcessing = parseInt(this.TIMEOUTS.ROW_PROCESSING);

            if (rowProcessing - dropdown < 100) {
                dropdown = rowProcessing - 100;
                this.TIMEOUTS.DROPDOWN = dropdown;
                document.querySelector('input[name="DROPDOWN"]').value = dropdown;
                this.showNotification('เวลา [ใส่จำนวน] ต้องมากกว่าเวลา [เลือกรายการ] อย่างน้อย 100 มิลลิวินาที', 'error', 2500);
                return;
            }

            if (dropdown > rowProcessing) {
                rowProcessing = dropdown + 100;
                this.TIMEOUTS.ROW_PROCESSING = rowProcessing;
                document.querySelector('input[name="ROW_PROCESSING"]').value = rowProcessing;
                this.showNotification('เวลา [ใส่จำนวน] ต้องมากกว่าเวลา [เลือกรายการ] อย่างน้อย 100 มิลลิวินาที', 'error', 2500);
                return;
            }

            GM_setValue('dropdownTimeout', this.TIMEOUTS.DROPDOWN);
            GM_setValue('rowProcessingTimeout', this.TIMEOUTS.ROW_PROCESSING);
            GM_setValue('nextItemTimeout', this.TIMEOUTS.NEXT_ITEM);
            this.showNotification('บันทึกเรียบร้อยแล้ว', 'success');
            closeOverlay();
        });

        resetButton.addEventListener('click', () => {
            this.TIMEOUTS.DROPDOWN = this.DEFAULT_TIMEOUTS.DROPDOWN;
            this.TIMEOUTS.ROW_PROCESSING = this.DEFAULT_TIMEOUTS.ROW_PROCESSING;
            this.TIMEOUTS.NEXT_ITEM = this.DEFAULT_TIMEOUTS.NEXT_ITEM;

            document.querySelector('input[name="DROPDOWN"]').value = this.DEFAULT_TIMEOUTS.DROPDOWN;
            document.querySelector('input[name="ROW_PROCESSING"]').value = this.DEFAULT_TIMEOUTS.ROW_PROCESSING;
            document.querySelector('input[name="NEXT_ITEM"]').value = this.DEFAULT_TIMEOUTS.NEXT_ITEM;

            GM_setValue('dropdownTimeout', this.DEFAULT_TIMEOUTS.DROPDOWN);
            GM_setValue('rowProcessingTimeout', this.DEFAULT_TIMEOUTS.ROW_PROCESSING);
            GM_setValue('nextItemTimeout', this.DEFAULT_TIMEOUTS.NEXT_ITEM);
        });

        cancelButton.addEventListener('click', () => {
            closeOverlay();
        });

        buttonContainer.appendChild(saveButton);
        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(resetButton);

        setTimeout(() => {
            overlay.classList.add('active');
        }, 10);
    }
}

// Initialize the script
new FlowAccountMenu();
