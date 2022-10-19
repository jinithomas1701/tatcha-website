var PagingModel = require('dw/web/PagingModel');

/**
 * BT Orders Paging Model
 */
function OrdersPagingModel() {
    this.pagingModel = null;
}

/**
 * @param  {Array} orders orders list
 * @param  {boolean} searchByPaymentMethodFlag flag whether search is by payment method
 * @returns {dw.web.PagingModel} paging model
 */
OrdersPagingModel.prototype.createPagingModel = function (orders, searchByPaymentMethodFlag) {
    this.pagingModel = searchByPaymentMethodFlag ? new PagingModel(orders) : new PagingModel(orders, orders.getCount());

    return this.pagingModel;
};

/**
 * Sets paging/paging size for orders list's paging model
 * @param {dw.web.PagingModel} pagingModel pagingModel to be set
 * @param {Object} page request.httpParameterMap.page
 * @param {Object} pagesize request.httpParameterMap.pagesize
 * @returns {dw.web.PagingModel} paging model
 */
OrdersPagingModel.prototype.setPagingModelSize = function (pagingModel, page, pagesize) {
    var pageSize = pagesize.intValue || 10;
    var currentPage = page.intValue || 1;
    pageSize = pageSize === 0 ? 5000 : pageSize; // Set pageSize as 5000 (max 20000 by DW quota) if BM user selected "All" items" per page
    this.pagingModel.setPageSize(pageSize);
    this.pagingModel.setStart(pageSize * (currentPage - 1));

    return this.pagingModel;
};

module.exports = OrdersPagingModel;
