// ==UserScript==
// @name         Flow Account Menu
// @namespace    http://tampermonkey.net/
// @version      1.65
// @description  Automatically populate data into Invoice, Billing Note, and Quotations.
// @author       AI code
// @match        *.flowaccount.com/*/business/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=flowaccount.com
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
        this.initConstGlobal();
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
/*         APP        */
/*--------------------*/

            html { font-size: 100%; }
            body {
                text-rendering: optimizeLegibility;
                font-smooth: antialiased;
                -webkit-font-smoothing: antialiased;
            }
            #app-container {
                position: fixed;
                height: 85vh;
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

/*--------------------*/
/*      HEADER        */
/*--------------------*/

            #header-container{
               display: flex;
               justify-content: space-between;
               align-items: center;
               margin-bottom: 5px;
            }
            #imgHeader{
               display: inline-block;
               float:left;
            }
            #imgHeader img{
               width: 250px;
            }
            #search-box{
               border-radius: 5px;
               border: 1px solid #ddd;
            }
            #search-box:focus{
               border: 1px solid #2898CB;
               box-shadow: 0 0 2px #2898CB;
            }
            #filter-container{
                display: flex;
                position: relative;
                z=index: 20;
                gap: 5px;
            }
            #table-container{
                max-height: 65vh;
                overflow-y: auto;
            }
            .filter-dropdown {
                position: relative;
                display: inline-block;
            }
            .filter-dropbtn {
                background-color: white;
                color: #333;
                border: 1px solid #ddd;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.9em;
            }
            .filter-dropbtn:focus {
                background-color: white;
                border: 1px solid #2898CB;
                box-shadow: 0 0 2px #2898CB;
            }
            .filter-arrow {
                margin-left: 5px;
                font-size: 10px;
            }
            .filter-dropdown-content {
                display: none;
                position: absolute;
                text-align: right;
                background-color: white;
                min-width: 140px;
                box-shadow: 0px 2px 5px rgba(0,0,0,0.2);
                border: 1px solid #ddd;
                border-radius: 4px;
                z-index: 25;
            }
            .filter-dropdown-content a {
                color: #333;
                padding: 5px 12px;
                text-decoration: none;
                display: block;
                font-size: 0.9em;
                border-radius: 4px;
            }
            .filter-dropdown-content a:hover {
                background-color: #2898CB;
                color: white;
            }
            .filter-dropdown:hover .filter-dropdown-content {
                display: block;
            }

/*--------------------*/
/*       TABLE        */
/*--------------------*/

            #product-list-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 16%;
                overflow-y: auto;
                scroll-behavior: smooth;
                overscroll-behavior: contain;
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
                outline: none;
                box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);
            }
            .amount-input:focus, .extra-input:focus {
                border-color: #2898CB;
                box-shadow:
                  inset 0 1px 2px rgba(0,0,0,0.05),
                  0 0 0 2px rgba(40, 152, 203, 0.2);
            }
            #controls-container {
                position: sticky;
                bottom: 0;
                padding: 10px;
                background-color: white;
                border-top: 1px solid #ccc;
                display: flex;
                flex-direction: column;
                align-items: center;
                width: 100%;
                text-align: left;
                z-index: 10;
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
                will-change: transform, opacity;
                contain: content;
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
                animation: fadeIn 0.3s ease-out forwards;
                z-index: 10000;
                display: flex;
                justify-content: center;
                align-items: center;
                font-size: 1.5em;
                color: #2898CB;
                backdrop-filter: blur(1px);
            }
            #force-stop-button{
                width: 100px;
                font-size: 0.55em;
                cursor: pointer;
                color: #ff4444;
                border: none;
                border: 2px solid #e0e0e0;
                border-radius: 5px;
                background-color: white;
            }
            #force-stop-button:hover{
                color: white;
                background-color: #ff4444;
                border: 2px solid #ff4444;
                transition: all 0.12s ease;
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
                box-shadow:
                  0 2px 4px rgba(0,0,0,0.1),
                  0 4px 8px rgba(0,0,0,0.1);
                transform: translateZ(0);
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

            #close-app:before{
                content: "✖ ";
                font-size: 1.2em;
            }

            #setting-list:before {
                content: "☰ ";
                font-size: 1.2em;
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
				transition:
                   opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1),
                   transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                backface-visibility: hidden; /* Fixes flickering */
			}

			#app-container.visible {
				display: block;
				opacity: 1;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%) translateY(0);
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
            .warning-text{
                display: flex;
                justify-content: flex-start;
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

            .button-primary:hover {
                background-color: #2887B6;
                transform: translateY(-1px);
            }
            .setting-product-button:active {
                transform: translateY(0);
            }
		    #product-save:before{
		    	content: "🖫 ";
		    	font-size: 1.3em;
		    }
		    #product-edit:before{
		    	content: "✎ ";
		    	font-size: 1.2em;
		    }
		    #prudct-close:before{
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
            textarea:disabled {
                background-color: #f9f9f9;
                color: grey;
                cursor: not-allowed;
                pointer-events: none;
                overflow: hidden;
            }
            button:disabled{
               cursor: not-allowed;
               pointer-events: none;
               opacity: 0.6;
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
                font-size: 1.2em;
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
                border-color: #2898CB;
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
                background-color: #2898CB;
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

    initConstGlobal(){
        this.PATHS = ['/invoices/', '/billing-notes/', '/quotations/'];
        this.DEFAULT_TIMEOUTS = {
            DROPDOWN: 600,
            ROW_PROCESSING: 800,
            NEXT_ITEM: 100,
        };
        this.TIMEOUTS = {
            DROPDOWN: GM_getValue('dropdownTimeout', this.DEFAULT_TIMEOUTS.DROPDOWN),
            ROW_PROCESSING: GM_getValue('rowProcessingTimeout', this.DEFAULT_TIMEOUTS.ROW_PROCESSING),
            NEXT_ITEM: GM_getValue('nextItemTimeout', this.DEFAULT_TIMEOUTS.NEXT_ITEM),
        };
        this.productList = GM_getValue('productList', []);
        this.lastUrl = location.href;
        this.forceStop = false;
        this.cachedElements = {
            amountInputs: null,
            extraInputs: null,
            productTable: null
        };
    }

    initApplication() {
        this.app = document.createElement('div');
        this.app.id = 'app-container';
        this.app.innerHTML = `
          <div id="header-container">
              <div id="imgHeader"><img src="https://flowaccountcdn.com/new_landing/image/flowaccount_logo_banner.svg"></img></div>
              <div id="filter-container">
                 <input type="text" id="search-box" placeholder="ค้นหา 🔍︎" onclick="this.select()" />
                 <div class="filter-dropdown">
                      <button class="filter-dropbtn">
                        กรองข้อมูล: ทั้งหมด
                        <span class="filter-arrow">▼</span>
                      </button>
                      <div class="filter-dropdown-content">
                        <a href="#" data-value="all">ทั้งหมด</a>
                        <a href="#" data-value="selected">ที่มีจำนวน</a>
                      </div>
                      <input type="hidden" id="filter-select" value="all">
                 </div>
             </div>
          </div>
          <div id="table-container">
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

        this.setupFilterDropdown();

        document.getElementById('filter-select').addEventListener('change', this.filterTable);

        document.getElementById('search-box').addEventListener('input',this._debounce(this.filterTable.bind(this), 100));


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

        document.getElementById('options-list').addEventListener('input', (e) => {
            if (e.target.classList.contains('amount-input') ||
                e.target.classList.contains('extra-input')){
                this.updateSelectedCount();
                this.updateRowColors();
            }
        });

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
            if (event.key === "Escape") this.hide();
            // Select only visible input fields inside the table
            const inputs = Array.from(document.querySelectorAll('input.amount-input, input.extra-input'))
            .filter(input => input.offsetParent !== null); // Only keep visible elements

            const currentIndex = inputs.indexOf(document.activeElement);
            if (currentIndex === -1) return;

            const columnCount = 2; // 2 input fields per row (amount-input & extra-input)
            let prevent = false;

            switch(event.key) {
                case 'ArrowRight':
                    if ((currentIndex + 1) % columnCount !== 0) {
                        inputs[currentIndex + 1]?.focus();
                        prevent = true;
                    }
                    break;
                case 'ArrowLeft':
                    if (currentIndex % columnCount !== 0) {
                        inputs[currentIndex - 1]?.focus();
                        prevent = true;
                    }
                    break;
                case 'ArrowDown':
                    if (currentIndex + columnCount < inputs.length) {
                        inputs[currentIndex + columnCount]?.focus();
                        prevent = true;
                    }
                    break;
                case 'ArrowUp':
                    if (currentIndex - columnCount >= 0) {
                        inputs[currentIndex - columnCount]?.focus();
                        prevent = true;
                    }
                    break;
            }

            // Prevent default behavior even if no navigation occurs
            if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
                event.preventDefault();
            }
        });
    }

    _debounce(func, wait) { //Debounce the Search (Better Performance When Typing)
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    clearAndUpdate(){
        document.getElementById('filter-select').value = 'all';
        const dropdown = this.app.querySelector('.filter-dropbtn');
        dropdown.innerHTML = `กรองข้อมูล: ทั้งหมด <span class="filter-arrow">▼</span>`;
        this.filterTable();
        this.updateSelectedCount();
        this.updateRowColors();
    }

    setupFilterDropdown() {
        const dropdownBtn = this.app.querySelector('.filter-dropbtn');
        const dropdownContent = this.app.querySelector('.filter-dropdown-content');
        const hiddenInput = this.app.querySelector('#filter-select');

        // Toggle dropdown on button click
        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownContent.style.display = dropdownContent .style.display === 'block' ? 'none' : 'block';
        });

        // Handle item selection
        this.app.querySelectorAll('.filter-dropdown-content a').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const value = e.target.getAttribute('data-value');
                const text = e.target.textContent;

                hiddenInput.value = value;
                dropdownBtn.innerHTML = `กรองข้อมูล: ${text} <span class="filter-arrow">▼</span>`;
                dropdownContent.style.display = 'none'; // Close after selection
                this.filterTable();
            });
        });

        // Close dropdown when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.filter-dropdown')) {
                dropdownContent.style.display = 'none';
            }
        });
    }

    filterTable() {
        const searchQuery = document.getElementById('search-box').value.toLowerCase();
        const searchParts = searchQuery.split(' ').filter(part => part.trim() !== '');
        const filterType = document.getElementById('filter-select').value;
        const rows = document.querySelectorAll('#product-list-table tbody tr');

        let rowNumber = 1;
        let hasSelectedItems = false;

        // First loop: Determine if any row has amount > 0 or extra > 0
        rows.forEach(row => {
            const amountInput = row.querySelector('.amount-input');
            const extraInput = row.querySelector('.extra-input');
            const amount = amountInput ? parseFloat(amountInput.value) || 0 : 0;
            const extra = extraInput ? parseFloat(extraInput.value) || 0 : 0;

            if (amount > 0 || extra > 0) {
                hasSelectedItems = true;
            }
        });

        // Second loop: Apply filtering
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            const productName = cells[1] ? cells[1].textContent.toLowerCase() : '';
            const amountInput = row.querySelector('.amount-input');
            const extraInput = row.querySelector('.extra-input');
            const amount = amountInput ? parseFloat(amountInput.value) || 0 : 0;
            const extra = extraInput ? parseFloat(extraInput.value) || 0 : 0;
            const isSelected = amount > 0 || extra > 0;

            let shouldShow = false;

            if (filterType === "selected") {
                // Show only if selected (amount > 0 or extra > 0)
                shouldShow = isSelected;
            } else if (filterType === "all") {
                // Show all items
                shouldShow = true;
            }

            // Apply search filtering
            if (shouldShow) {
                const matchesSearch = searchParts.every(part => productName.includes(part));
                if (matchesSearch) {
                    row.style.display = '';
                    row.querySelectorAll('td')[0].textContent = rowNumber++; // Update row numbering
                } else {
                    row.style.display = 'none';
                }
            } else {
                row.style.display = 'none';
            }
        });

        // If no selected items exist, ensure all rows remain hidden
        if (filterType === "selected" && !hasSelectedItems) {
            rows.forEach(row => {row.style.display = 'none'});
        }
    }

    clearSearch(){
        document.getElementById('search-box').value = '';
        this.filterTable();
    }

    show() {
        if(this.app.style.display === 'block'){
            this.hide();
            return;
        }
        this.app.style.display = 'block';
        requestAnimationFrame(() => {
            this.app.classList.add('visible');
        });
    }

    hide() {
        this.app.classList.remove('visible');
        setTimeout(() => {
            requestAnimationFrame(() => {
                this.app.style.display = 'none';
            });
        }, 500);
    }

    initOpenButton() {
        // Create the button element
        this.openAppButton = document.createElement('button');
        this.openAppButton.id = 'openAppButton';
        this.openAppButton.innerText ='✚ เพิ่มรายการ';

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
            '//*[@id="documentHeader"]/div/div[2]',
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
        ).singleNodeValue;

        if (target) {
            // Check if button does not exist
            if (!document.getElementById(this.openAppButton.id)) {
                target.insertBefore(this.openAppButton,target.firstChild);
                this.openAppButton.style.display = 'inline-block';
                let zipInput = document.querySelector('.contact-zipcode');
                if(zipInput){
                    zipInput.addEventListener('change', (event) => {
                        console.log(event.zipInput.value)
                    });
                }
            }
        } else if (attempt < maxAttempts) {
            setTimeout(() => this.injectButtonWithRetry(attempt + 1), retryDelay);
        }
    }

    setupObservers() {
        const observer = new MutationObserver((mutations) => {
            if (!document.getElementById(this.openAppButton.buttonId) && this.openAppButton) {
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
        this.clearAndUpdate()
    }

    showLoading(show, message = 'กำลังประมวลผล...') {
        let loader = document.getElementById('loading-overlay');

        if (show) {
            if (!loader) {
                loader = document.createElement('div');
                loader.id = 'loading-overlay';
                loader.className = 'loading-overlay';
                // Adjust flex direction to stack the message and button vertically.
                loader.style.flexDirection = 'column';
                document.body.appendChild(loader);
            } else {
                // Clear previous content if loader already exists
                loader.innerHTML = '';
            }

            // Create and append the message element
            const messageElem = document.createElement('div');
            messageElem.textContent = message;
            messageElem.style.marginBottom = '10px';
            loader.appendChild(messageElem);

            // Create and append the "Stop" button
            const stopButton = document.createElement('button');
            stopButton.textContent = 'หยุดการทำงาน';
            stopButton.id = 'force-stop-button';
            stopButton.addEventListener('click', () => {
                // Remove the loader when the button is clicked
                if (loader) {
                    this.forceStop = true;
                    //document.body.removeChild(loader);
                }
            });
            loader.appendChild(stopButton);

            // Return an updater function for the message element
            return (newMessage) => {
                messageElem.textContent = newMessage;
            };
        } else if (loader) {
            document.body.removeChild(loader);
        }

        // In case the loader does not exist, return a no-op function.
        return () => {};
    }


    /*showLoading(show, message = 'กำลังประมวลผล...') {
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
    }*/

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
            const amount = parseInt(row.querySelector('.amount-input').value) || 0;
            const extra = parseInt(row.querySelector('.extra-input').value) || 0;
            const shouldHighlight = amount > 0 || extra > 0;
            row.classList.toggle('highlight-row', shouldHighlight);
            row.querySelector('td:first-child').classList.toggle('highlight-number', shouldHighlight);
            row.querySelector('td:nth-child(2)').classList.toggle('highlight-product', shouldHighlight);
        });
    }

    displayProductList() {
        const optionsList = document.getElementById('options-list');
        optionsList.innerHTML = "";
        if(this.productList.length === 0){ // empty table
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
            return;
        }

        const fragment = document.createDocumentFragment();
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
            fragment.appendChild(row);
        });
        optionsList.appendChild(fragment);
        this.cachedElements.amountInputs = null; //Reset cache
        this.updateSelectedCount();
    }

    updateSelectedCount() {
        if (!this.cachedElements.amountInputs) {
            this.cachedElements.amountInputs = document.querySelectorAll('.amount-input');
            this.cachedElements.extraInputs = document.querySelectorAll('.extra-input');
        }

        const amountInputs = this.cachedElements.amountInputs;
        const extraInputs = this.cachedElements.extraInputs;
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

        // Set inner HTML structure
        overlay.innerHTML = `
        <div class="setting-product-container">
            <div id="txt-header">รายการสินค้า</div>
            <textarea
                class="setting-product-textarea"
                placeholder="ใส่รายการสินค้า, บรรทัดละ 1 รายการ..."
                disabled
            ></textarea>
            <div class="setting-product-button-container">
                <button class="setting-product-button button-primary" id="product-save" disabled>บันทึก</button>
                <button class="setting-product-button button-primary" id="product-edit">แก้ไข</button>
                <button class="setting-product-button button-primary" id="product-close">ยกเลิก</button>
            </div>
        </div>
    `;
        document.body.appendChild(overlay);

        const textArea = overlay.querySelector('.setting-product-textarea');
        textArea.value = this.productList.join('\n');

        const saveButton = overlay.querySelector('#product-save');
        const editButton = overlay.querySelector('#product-edit');
        const closeButton = overlay.querySelector('#product-close');

        const closeOverlay = () => {
            overlay.classList.remove('active');
            setTimeout(() => {
                overlay.remove();
                this.show();
            }, 200);
        };

        saveButton.addEventListener('click', () => {
            this.productList = textArea.value.split("\n").map(item => item.trim()).filter(item => item.length > 0);
            GM_setValue('productList', this.productList);
            this.showNotification('บันทึกเรียบร้อยแล้ว', 'success');
            this.displayProductList();
            closeOverlay();
        });

        editButton.addEventListener('click', () => {
            textArea.disabled = false;
            saveButton.disabled = false;
            editButton.disabled = true;
        });

        closeButton.addEventListener('click', closeOverlay);

        this.hide();

        setTimeout(() => textArea.focus(), 100);
        setTimeout(() => {
            overlay.classList.add('active');
        }, 10);
    }

    disableKeyboardInput() {
        document.addEventListener("keydown", this.preventKeyEvent, true);
    }

    enableKeyboardInput() {
        document.removeEventListener("keydown", this.preventKeyEvent, true);
    }

    preventKeyEvent(event) {
        event.preventDefault();
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
            this.disableKeyboardInput();
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
                this.enableKeyboardInput();
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
                if (selectedProductIndex >= selectedProducts.length || this.forceStop) {
                    this.showLoading(false);
                    this.enableKeyboardInput();
                    if(this.forceStop){
                       this.forceStop = false;
                       this.showNotification('หยุดการทำงาน', 'error');
                    }else{
                       this.showNotification('ใส่ข้อมูลเสร็จสิ้น', 'success');
                    }
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
            this.enableKeyboardInput();
            console.error('Error processing products:', error);
        }
    }

    settingTimeout() {
        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        overlay.innerHTML = `
        <div class="timeout-container">
            <h3 class="timeout-title">ตั้งค่าหน่วงเวลา</h3>

            <div class="timeout-input-container">
                <label class="timeout-label">เวลา เลือกรายการ (มิลลิวินาที)</label>
                <input type="number" class="timeout-input" name="DROPDOWN" />
            </div>

            <div class="timeout-input-container">
                <label class="timeout-label">เวลา ใส่จำนวน (มิลลิวินาที)</label>
                <input type="number" class="timeout-input" name="ROW_PROCESSING" />
            </div>

            <div class="timeout-input-container">
                <label class="timeout-label">เวลา เริ่มรายการถัดไป (มิลลิวินาที)</label>
                <input type="number" class="timeout-input" name="NEXT_ITEM" />
            </div>

            <div class="timeout-button-container">
                <button id="timeout-save" class="timeout-button">บันทึก</button>
                <button id="timeout-cancel" class="timeout-button">ยกเลิก</button>
                <button id="timeout-reset" class="timeout-button">คืนค่าเริ่มต้น</button>
            </div>
        </div>
    `;
        document.body.appendChild(overlay);

        // Set initial values
        overlay.querySelector('input[name="DROPDOWN"]').value = this.TIMEOUTS.DROPDOWN;
        overlay.querySelector('input[name="ROW_PROCESSING"]').value = this.TIMEOUTS.ROW_PROCESSING;
        overlay.querySelector('input[name="NEXT_ITEM"]').value = this.TIMEOUTS.NEXT_ITEM;

        // Input event bindings
        overlay.querySelectorAll('.timeout-input').forEach(input => {
            input.addEventListener('input', () => {
                this.TIMEOUTS[input.name] = parseInt(input.value);
            });
        });

        const closeOverlay = () => {
            overlay.classList.remove('active');
            setTimeout(() => {
                overlay.remove();
                this.show();
            }, 200);
        };

        // Buttons
        overlay.querySelector('#timeout-save').addEventListener('click', () => {
            let dropdown = parseInt(this.TIMEOUTS.DROPDOWN);
            let rowProcessing = parseInt(this.TIMEOUTS.ROW_PROCESSING);

            if (rowProcessing - dropdown < 100) {
                dropdown = rowProcessing - 100;
                this.TIMEOUTS.DROPDOWN = dropdown;
                overlay.querySelector('input[name="DROPDOWN"]').value = dropdown;
                this.showNotification('เวลา [ใส่จำนวน] ต้องมากกว่าเวลา [เลือกรายการ] อย่างน้อย 100 มิลลิวินาที', 'error', 2500);
                return;
            }

            if (dropdown > rowProcessing) {
                rowProcessing = dropdown + 100;
                this.TIMEOUTS.ROW_PROCESSING = rowProcessing;
                overlay.querySelector('input[name="ROW_PROCESSING"]').value = rowProcessing;
                this.showNotification('เวลา [ใส่จำนวน] ต้องมากกว่าเวลา [เลือกรายการ] อย่างน้อย 100 มิลลิวินาที', 'error', 2500);
                return;
            }

            GM_setValue('dropdownTimeout', this.TIMEOUTS.DROPDOWN);
            GM_setValue('rowProcessingTimeout', this.TIMEOUTS.ROW_PROCESSING);
            GM_setValue('nextItemTimeout', this.TIMEOUTS.NEXT_ITEM);
            this.showNotification('บันทึกเรียบร้อยแล้ว', 'success');
            closeOverlay();
        });

        overlay.querySelector('#timeout-reset').addEventListener('click', () => {
            this.TIMEOUTS.DROPDOWN = this.DEFAULT_TIMEOUTS.DROPDOWN;
            this.TIMEOUTS.ROW_PROCESSING = this.DEFAULT_TIMEOUTS.ROW_PROCESSING;
            this.TIMEOUTS.NEXT_ITEM = this.DEFAULT_TIMEOUTS.NEXT_ITEM;

            overlay.querySelector('input[name="DROPDOWN"]').value = this.DEFAULT_TIMEOUTS.DROPDOWN;
            overlay.querySelector('input[name="ROW_PROCESSING"]').value = this.DEFAULT_TIMEOUTS.ROW_PROCESSING;
            overlay.querySelector('input[name="NEXT_ITEM"]').value = this.DEFAULT_TIMEOUTS.NEXT_ITEM;

            GM_setValue('dropdownTimeout', this.DEFAULT_TIMEOUTS.DROPDOWN);
            GM_setValue('rowProcessingTimeout', this.DEFAULT_TIMEOUTS.ROW_PROCESSING);
            GM_setValue('nextItemTimeout', this.DEFAULT_TIMEOUTS.NEXT_ITEM);
        });

        overlay.querySelector('#timeout-cancel').addEventListener('click', closeOverlay);

        setTimeout(() => {
            overlay.classList.add('active');
        }, 10);
    }

}

// Initialize the script
new FlowAccountMenu();
