(function (global) {
    const FD = global.FD = global.FD || {};
    function create(options) {
        let customerIndex = null;
        let customerKey = '';
        let filterValue = '';
        let resetScroll = true;
        function itemKey(type, item) {
            if (typeof options.getItemKey !== 'function')
                return '';
            const value = options.getItemKey(type, item);
            return value === undefined || value === null ? '' : String(value);
        }
        function customerForIndex(index) {
            if (index === null || typeof options.getItems !== 'function')
                return null;
            return options.getItems('customer').find((item) => Number(item.index) === index) || null;
        }
        function setCustomer(next, shouldResetScroll = false) {
            customerIndex = next;
            customerKey = itemKey('customer', customerForIndex(next) || {});
            if (shouldResetScroll)
                resetScroll = true;
        }
        function restoreCustomer() {
            if (!customerKey || typeof options.getItems !== 'function')
                return;
            const customer = options.getItems('customer').find((item) => itemKey('customer', item) === customerKey);
            if (customer)
                customerIndex = Number(customer.index);
            else
                setCustomer(null, true);
        }
        function takeScrollTop(list) {
            const top = resetScroll ? 0 : list.scrollTop;
            resetScroll = false;
            return top;
        }
        function restoreScroll(list, top) {
            if (top < 1)
                return;
            const restore = () => { if (list?.isConnected)
                list.scrollTop = top; };
            if (typeof window.requestAnimationFrame === 'function')
                window.requestAnimationFrame(restore);
            else
                restore();
        }
        return {
            get customerIndex() { return customerIndex; },
            get filterValue() { return filterValue; },
            setCustomer,
            restoreCustomer,
            setFilterValue(value) { filterValue = value; resetScroll = true; },
            takeScrollTop,
            restoreScroll,
            reset() { customerIndex = null; customerKey = ''; filterValue = ''; resetScroll = true; },
        };
    }
    FD.SelectSheetNavigatorState = { create };
})(window);
