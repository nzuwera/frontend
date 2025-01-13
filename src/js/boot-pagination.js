export class BootPagination {
    constructor(divElement, paginatedData) {
        this.divElement = divElement;
        this.paginatedData = paginatedData;
        this.currentPage = paginatedData.pageable.pageNumber;
        this.pageSize = paginatedData.pageable.pageSize;
        this.totalPages = paginatedData.totalPages;
        this.content = paginatedData.content;

        this.init();
    }

    init() {
        this.renderSearchFilter();
        this.renderTable();
        this.renderPaginationControls();
    }

    renderSearchFilter() {
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search...';
        searchInput.addEventListener('input', (event) => this.handleSearch(event.target.value));
        this.divElement.appendChild(searchInput);
    }

    handleSearch(searchTerm) {
        const filteredContent = this.content.filter(item =>
            Object.values(item).some(value => value.toString().toLowerCase().includes(searchTerm.toLowerCase()))
        );
        this.renderTable(filteredContent);
    }

    renderTable(data = this.content) {
        // Clear previous table if any
        const existingTable = this.divElement.querySelector('table');
        if (existingTable) {
            this.divElement.removeChild(existingTable);
        }

        const table = document.createElement('table');
        table.border = '1';

        // Create table header dynamically based on object keys
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const headers = Object.keys(data[0]);

        headers.forEach(header => {
            const th = document.createElement('th');
            th.innerText = this.camelCaseToTitleCase(header);
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create table body
        const tbody = document.createElement('tbody');

        data.forEach(item => {
            const row = document.createElement('tr');
            headers.forEach(header => {
                const td = document.createElement('td');
                td.innerText = item[header];
                row.appendChild(td);
            });
            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        this.divElement.appendChild(table);
    }

    renderPaginationControls() {
        // Clear previous pagination controls if any
        const existingControls = this.divElement.querySelector('.pagination-controls');
        if (existingControls) {
            this.divElement.removeChild(existingControls);
        }

        const paginationControls = document.createElement('div');
        paginationControls.className = 'pagination-controls';

        // Create Previous button
        const prevButton = document.createElement('button');
        prevButton.innerText = 'Previous';
        prevButton.disabled = this.currentPage === 0;
        prevButton.addEventListener('click', () => this.handlePageChange(this.currentPage - 1));

        // Create Next button
        const nextButton = document.createElement('button');
        nextButton.innerText = 'Next';
        nextButton.disabled = this.currentPage === this.totalPages - 1;
        nextButton.addEventListener('click', () => this.handlePageChange(this.currentPage + 1));

        paginationControls.appendChild(prevButton);
        paginationControls.appendChild(nextButton);
        this.divElement.appendChild(paginationControls);
    }

    handlePageChange(newPage) {
        this.currentPage = newPage;

        // Fetch new page data if needed (you can implement an API call here)
        // For this example, we'll assume `paginatedData` already contains all the data
        this.content = this.paginatedData.content.slice(this.currentPage * this.pageSize, (this.currentPage + 1) * this.pageSize);

        // Re-render the table and pagination controls
        this.renderTable();
        this.renderPaginationControls();
    }

    camelCaseToTitleCase(camelCase) {
        return camelCase.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    }
}