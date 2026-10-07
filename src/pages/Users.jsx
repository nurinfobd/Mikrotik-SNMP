import { useState, useEffect } from 'react';
import { Save, Users as UsersIcon, Plus, Trash2, Edit2 } from 'lucide-react';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', username: '', password: '', role: 'readonly'
  });
  const [error, setError] = useState('');
  
  // Check if current user is readonly
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isReadOnly = currentUser.role === 'readonly';

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = () => {
    fetch('/api/auth/users')
      .then(res => res.json())
      .then(data => {
         if(Array.isArray(data)) setUsers(data);
      })
      .catch(err => console.error("Error fetching users", err));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.username) {
      setError("Username is required");
      return;
    }
    if (!editingUser && !formData.password) {
      setError("Password is required for new users");
      return;
    }

    const url = editingUser ? `/api/auth/users/${editingUser.id}` : '/api/auth/users';
    const method = editingUser ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to save user");
      return;
    }

    setIsModalOpen(false);
    fetchUsers();
  };

  const handleDelete = async (id) => {
    if (users.length <= 1) {
      alert("Cannot delete the last user.");
      return;
    }
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    await fetch(`/api/auth/users/${id}`, { method: 'DELETE' });
    fetchUsers();
  };

  const openModal = (user = null) => {
    setError('');
    if (user) {
      setEditingUser(user);
      setFormData({ 
        name: user.name || '', 
        username: user.username, 
        password: '',
        role: user.role || 'readonly'
      });
    } else {
      setEditingUser(null);
      setFormData({ 
        name: '', username: '', password: '', role: 'readonly'
      });
    }
    setIsModalOpen(true);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Portal Users</h2>
        {!isReadOnly && (
          <button className="btn btn-primary" onClick={() => openModal()} style={{ padding: '8px 16px', borderRadius: '8px' }}>
            <Plus size={18} /> Add User
          </button>
        )}
      </div>
      
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
            <tr>
              <th style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--text-secondary)' }}>Name</th>
              <th style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--text-secondary)' }}>Username</th>
              <th style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--text-secondary)' }}>Role</th>
              {!isReadOnly && <th style={{ padding: '12px 20px', fontWeight: 600, color: 'var(--text-secondary)', width: '100px' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="3" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <UsersIcon size={48} color="#94a3b8" style={{ margin: '0 auto 16px' }} />
                  No portal users found.
                </td>
              </tr>
            ) : users.map(user => (
              <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px 20px', fontWeight: 500 }}>{user.name || '-'}</td>
                <td style={{ padding: '12px 20px' }}>{user.username}</td>
                <td style={{ padding: '12px 20px' }}>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    fontSize: '0.8rem', 
                    fontWeight: 'bold', 
                    background: user.role === 'admin' ? '#dbeafe' : '#f3f4f6', 
                    color: user.role === 'admin' ? '#1e40af' : '#4b5563' 
                  }}>
                    {user.role === 'admin' ? 'Admin' : 'ReadOnly'}
                  </span>
                </td>
                {!isReadOnly && (
                  <td style={{ padding: '12px 20px', display: 'flex', gap: '8px' }}>
                    <button className="btn" style={{ padding: '6px', color: 'var(--text-secondary)', background: '#f1f5f9', borderRadius: '8px' }} onClick={() => openModal(user)}>
                      <Edit2 size={16} />
                    </button>
                    <button className="btn" style={{ padding: '6px', color: '#ef4444', background: '#fef2f2', borderRadius: '8px' }} onClick={() => handleDelete(user.id)}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', width: '90%' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '20px' }}>
              {editingUser ? 'Edit User' : 'New User'}
            </h3>
            
            {error && (
              <div style={{ background: '#fef2f2', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. John Doe" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Username</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. admin" 
                  value={formData.username}
                  onChange={e => setFormData({...formData, username: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Password {editingUser && <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>(leave blank to keep current)</span>}</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="Password" 
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  required={!editingUser}
                />
              </div>

              <div className="form-group">
                <label>Role</label>
                <select 
                  className="form-input" 
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                >
                  <option value="admin">Admin User</option>
                  <option value="readonly">ReadOnly User</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '32px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn" style={{ background: '#f1f5f9', color: 'var(--text-secondary)' }} onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ padding: '8px 20px', borderRadius: '8px' }}>
                  <Save size={18} /> Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
