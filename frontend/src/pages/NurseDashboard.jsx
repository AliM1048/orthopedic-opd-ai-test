import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Phone, Calendar, Users, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import StatusBadge from '../components/common/StatusBadge';

export default function NurseDashboard({ patients, onUpdateStatus }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    let list = patients;
    if (filter !== 'all') list = list.filter((p) => p.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) || p.mrn.toLowerCase().includes(q)
      );
    }
    return list;
  }, [patients, filter, search]);

  const stats = useMemo(() => ({
    total:     patients.length,
    pending:   patients.filter((p) => p.status === 'pending').length,
    completed: patients.filter((p) => p.status === 'completed' || p.status === 'assessment-completed').length,
    followUp:  patients.filter((p) => p.status === 'follow-up').length,
  }), [patients]);

  return (
    <>
      {/* Top Bar */}
      <div className="topbar">
        <div className="topbar-left">
          <h1>Nurse Dashboard</h1>
          <p>Today's appointments · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-icon blue"><Users size={24} /></div>
            <div>
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total Patients</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon yellow"><Clock size={24} /></div>
            <div>
              <div className="stat-value">{stats.pending}</div>
              <div className="stat-label">Pending Call</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green"><CheckCircle size={24} /></div>
            <div>
              <div className="stat-value">{stats.completed}</div>
              <div className="stat-label">Completed</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple"><AlertTriangle size={24} /></div>
            <div>
              <div className="stat-value">{stats.followUp}</div>
              <div className="stat-label">Follow-Up</div>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Scheduled Patients</div>
              <div className="card-subtitle">{filtered.length} patient{filtered.length !== 1 ? 's' : ''} found</div>
            </div>
            <div className="search-bar">
              <Search size={16} color="#94a3b8" />
              <input
                placeholder="Search patients…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="filters-row">
            {['all', 'pending', 'assessment-completed', 'follow-up', 'completed'].map((f) => (
              <button
                key={f}
                className={`filter-chip ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : f === 'assessment-completed' ? 'Assessed' : f === 'follow-up' ? 'Follow-Up' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <p>No patients match your filter.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>MRN</th>
                  <th>Appointment</th>
                  <th>Body Area</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} onClick={() => navigate(`/patient/${p.id}`)}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="patient-avatar" style={{ background: p.avatar }}>
                          {p.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div className="fw-600">{p.name}</div>
                          <div className="text-muted">{p.age}y · {p.gender}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm">{p.mrn}</td>
                    <td>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar size={14} color="#94a3b8" />
                        {p.appointmentTime}
                      </div>
                    </td>
                    <td className="text-sm fw-600">{p.bodyArea}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td>
                      {p.status === 'pending' && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={(e) => { e.stopPropagation(); navigate(`/assessment?patient=${p.id}`); }}
                        >
                          <Phone size={14} /> Start Call
                        </button>
                      )}
                      {p.status === 'follow-up' && (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={(e) => { e.stopPropagation(); navigate(`/assessment?patient=${p.id}&type=followup`); }}
                        >
                          Follow-Up
                        </button>
                      )}
                      {(p.status === 'assessment-completed' || p.status === 'completed') && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={(e) => { e.stopPropagation(); navigate(`/patient/${p.id}`); }}
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
