import React from 'react';
import useApi from '../hooks/useApi';
import { getUsers } from '../services/apiClient';

const UserList = () => {
  const { data: users, loading, error } = useApi(getUsers);

  if (loading) return <p>Loading users...</p>;
  if (error) return <p>Error fetching users: {error.message}</p>;

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">User List</h2>
      <ul className="list-disc list-inside">
        {users && users.map(user => (
          <li key={user.id}>{user.username} ({user.email})</li>
        ))}
      </ul>
    </div>
  );
};

export default UserList;
