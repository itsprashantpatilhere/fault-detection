import { useState, useEffect } from 'react';
import { Calendar, Filter, RefreshCw, MapPin, Users, Activity, Search, Cpu, Hash } from 'lucide-react';
import './MachineFilterBar.css';

// Get default dates
const getDefaultDates = () => {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  return { today, weekAgo };
};

// Search field options
const SEARCH_FIELDS = [
  { value: 'machineName', label: 'Machine Name', icon: Cpu },
  { value: 'machineId', label: 'Machine ID', icon: Hash },
  { value: 'customerId', label: 'Customer ID', icon: Users },
  { value: 'areaId', label: 'Area ID', icon: MapPin }
];

const MachineFilterBar = ({ 
  onApplyFilter,
  areaOptions = ['All'],
  statusOptions = ['All', 'Normal', 'Satisfactory', 'Alert', 'Unsatisfactory'],
  customerOptions = ['All'],
  initialFilters = {},
  onSearch
}) => {
  const { today, weekAgo } = getDefaultDates();
  
  const [filters, setFilters] = useState({
    areaId: initialFilters.areaId || 'All',
    status: initialFilters.status || 'All',
    customerId: initialFilters.customerId || 'All',
    fromDate: initialFilters.fromDate || weekAgo,
    toDate: initialFilters.toDate || today
  });

  // Search state - initialize from initialFilters
  const [searchField, setSearchField] = useState(initialFilters.searchField || 'machineName');
  const [searchQuery, setSearchQuery] = useState(initialFilters.searchQuery || '');

  // Update local state when initialFilters change (e.g., from bar chart click)
  useEffect(() => {
    if (Object.keys(initialFilters).length > 0) {
      const newFilters = {
        areaId: initialFilters.areaId || 'All',
        status: initialFilters.status || 'All',
        customerId: initialFilters.customerId || 'All',
        fromDate: initialFilters.fromDate || weekAgo,
        toDate: initialFilters.toDate || today
      };
      setFilters(newFilters);
      // Also update search state
      if (initialFilters.searchField !== undefined) {
        setSearchField(initialFilters.searchField || 'machineName');
      }
      if (initialFilters.searchQuery !== undefined) {
        setSearchQuery(initialFilters.searchQuery || '');
      }
    }
  }, [initialFilters.areaId, initialFilters.status, initialFilters.customerId, initialFilters.fromDate, initialFilters.toDate, initialFilters.searchField, initialFilters.searchQuery]);

  const handleChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleApply = () => {
    console.log('Applying machine filters:', filters);
    if (onApplyFilter) {
      onApplyFilter({ ...filters, searchField, searchQuery });
    }
  };

  const handleSearch = () => {
    console.log('Searching:', searchField, searchQuery);
    if (onApplyFilter) {
      onApplyFilter({ ...filters, searchField, searchQuery });
    }
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleReset = () => {
    const { today, weekAgo } = getDefaultDates();
    const resetFilters = {
      areaId: 'All',
      status: 'All',
      customerId: 'All',
      fromDate: weekAgo,
      toDate: today
    };
    setFilters(resetFilters);
    setSearchQuery('');
    setSearchField('machineName');
    console.log('Filters reset');
    if (onApplyFilter) {
      onApplyFilter({ ...resetFilters, searchField: 'machineName', searchQuery: '' });
    }
  };

  const SelectedIcon = SEARCH_FIELDS.find(f => f.value === searchField)?.icon || Search;

  return (
    <div className="machine-filter-bar">
      <div className="filter-bar-header">
        <div className="filter-bar-title">
          <Filter size={18} />
          <span>Filter Machines</span>
        </div>
      </div>
      
      <div className="filter-bar-content">
        {/* Search Bar Row */}
        <div className="search-row">
          <div className="search-container">
            <div className="search-field-selector">
              <select
                value={searchField}
                onChange={(e) => setSearchField(e.target.value)}
                className="search-field-select"
              >
                {SEARCH_FIELDS.map(field => (
                  <option key={field.value} value={field.value}>
                    {field.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="search-input-wrapper">
              <SelectedIcon size={16} className="search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                placeholder={`Search by ${SEARCH_FIELDS.find(f => f.value === searchField)?.label || 'field'}...`}
                className="search-input"
              />
              {searchQuery && (
                <button 
                  className="search-clear-btn"
                  onClick={() => {
                    setSearchQuery('');
                    if (onApplyFilter) {
                      onApplyFilter({ ...filters, searchField, searchQuery: '' });
                    }
                  }}
                >
                  ×
                </button>
              )}
            </div>
            <button className="btn btn-primary search-btn" onClick={handleSearch}>
              <Search size={16} />
              Search
            </button>
          </div>
        </div>

        <div className="filter-row">
          <div className="filter-group">
            <label className="filter-label">
              <MapPin size={14} />
              Area ID
            </label>
            <select
              value={filters.areaId}
              onChange={(e) => handleChange('areaId', e.target.value)}
              className="filter-select"
            >
              {areaOptions.map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">
              <Activity size={14} />
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="filter-select"
            >
              {statusOptions.map(status => (
                <option key={status} value={status}>
                  {status === 'All' ? 'All Statuses' : status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">
              <Users size={14} />
              Customer ID
            </label>
            <select
              value={filters.customerId}
              onChange={(e) => handleChange('customerId', e.target.value)}
              className="filter-select"
            >
              {customerOptions.map(customer => (
                <option key={customer} value={customer}>
                  {customer === 'All' ? 'All Customers' : (customer.length > 20 ? customer.substring(0, 20) + '...' : customer)}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">
              <Calendar size={14} />
              From Date
            </label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => handleChange('fromDate', e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">
              <Calendar size={14} />
              To Date
            </label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => handleChange('toDate', e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="filter-actions">
            <button className="btn btn-secondary" onClick={handleReset}>
              <RefreshCw size={16} />
              Reset
            </button>
            <button className="btn btn-primary" onClick={handleApply}>
              <Filter size={16} />
              Apply Filter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MachineFilterBar;
