import { supabase } from "./supabase";
import { Employee, Notification, Task, Project } from "./types";

// Employees
export async function getEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching employees:', error);
    return [];
  }
  
  return data.map(e => ({
    id: e.id,
    name: e.name,
    email: e.email,
    role: e.role,
    status: e.status as 'active' | 'inactive',
    password: e.password
  }));
}

export async function addEmployee(employee: Omit<Employee, 'id'>): Promise<Employee | null> {
  const { data, error } = await supabase
    .from('employees')
    .insert({
      name: employee.name,
      email: employee.email,
      password: employee.password || '',
      role: employee.role,
      status: employee.status
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error adding employee:', error);
    return null;
  }
  
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    role: data.role,
    status: data.status,
    password: data.password
  };
}

export async function updateEmployee(employee: Employee): Promise<boolean> {
  const { error } = await supabase
    .from('employees')
    .update({
      name: employee.name,
      email: employee.email,
      password: employee.password,
      role: employee.role,
      status: employee.status
    })
    .eq('id', employee.id);
  
  if (error) {
    console.error('Error updating employee:', error);
    return false;
  }
  
  return true;
}

export async function deleteEmployee(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting employee:', error);
    return false;
  }
  
  return true;
}

// Tasks
export async function getTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
  
  return data.map(t => ({
    id: t.id,
    title: t.title,
    description: t.description,
    assignedTo: t.assigned_to,
    projectId: t.project_id || undefined,
    expectedTime: t.expected_time,
    deadline: t.deadline,
    priority: t.priority as 'low' | 'medium' | 'high',
    status: t.status as 'pending' | 'in-progress' | 'completed',
    createdAt: t.created_at,
    startedAt: t.started_at || undefined,
    completedAt: t.completed_at || undefined,
    actualTime: t.actual_time || undefined,
    efficiency: t.efficiency || undefined,
    extensionRequest: t.extension_status ? {
      reason: t.extension_reason,
      proposedDeadline: t.extension_proposed_deadline,
      requestedAt: t.extension_requested_at,
      status: t.extension_status,
      adminResponse: t.extension_admin_response || undefined,
      blockedByEmployee: t.extension_blocked_by_employee || undefined
    } : undefined,
    cancellationRequest: t.cancellation_status ? {
      reason: t.cancellation_reason,
      requestedAt: t.cancellation_requested_at,
      status: t.cancellation_status,
      adminResponse: t.cancellation_admin_response || undefined
    } : undefined
  }));
}

export async function addTask(task: Omit<Task, 'id'>): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: task.title,
      description: task.description,
      assigned_to: task.assignedTo,
      project_id: task.projectId || null,
      expected_time: task.expectedTime,
      deadline: task.deadline,
      priority: task.priority,
      status: task.status,
      started_at: task.startedAt || null,
      completed_at: task.completedAt || null,
      actual_time: task.actualTime || null,
      efficiency: task.efficiency || null
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error adding task:', error);
    return null;
  }
  
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    assignedTo: data.assigned_to,
    projectId: data.project_id || undefined,
    expectedTime: data.expected_time,
    deadline: data.deadline,
    priority: data.priority,
    status: data.status,
    createdAt: data.created_at,
    startedAt: data.started_at || undefined,
    completedAt: data.completed_at || undefined,
    actualTime: data.actual_time || undefined,
    efficiency: data.efficiency || undefined
  };
}

export async function updateTask(task: Task): Promise<boolean> {
  const updateData: any = {
    title: task.title,
    description: task.description,
    assigned_to: task.assignedTo,
    expected_time: task.expectedTime,
    deadline: task.deadline,
    priority: task.priority,
    status: task.status,
    started_at: task.startedAt || null,
    completed_at: task.completedAt || null,
    actual_time: task.actualTime || null,
    efficiency: task.efficiency || null
  };

  // Only add extension fields if they exist (for backward compatibility)
  if (task.extensionRequest) {
    updateData.extension_reason = task.extensionRequest.reason || null;
    updateData.extension_proposed_deadline = task.extensionRequest.proposedDeadline || null;
    updateData.extension_requested_at = task.extensionRequest.requestedAt || null;
    updateData.extension_status = task.extensionRequest.status || null;
    updateData.extension_admin_response = task.extensionRequest.adminResponse || null;
    updateData.extension_blocked_by_employee = task.extensionRequest.blockedByEmployee || null;
  }

  // Only add cancellation fields if they exist
  if (task.cancellationRequest) {
    updateData.cancellation_reason = task.cancellationRequest.reason || null;
    updateData.cancellation_requested_at = task.cancellationRequest.requestedAt || null;
    updateData.cancellation_status = task.cancellationRequest.status || null;
    updateData.cancellation_admin_response = task.cancellationRequest.adminResponse || null;
  }

  console.log('Updating task with data:', updateData);
  
  const { error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', task.id);
  
  if (error) {
    console.error('Error updating task:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return false;
  }
  
  return true;
}

export async function saveTasks(tasks: Task[]): Promise<boolean> {
  // Update multiple tasks
  for (const task of tasks) {
    const success = await updateTask(task);
    if (!success) return false;
  }
  return true;
}

// Notifications
export async function getNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
  
  return data.map(n => ({
    id: n.id,
    message: n.message,
    read: n.read,
    createdAt: n.created_at,
    forUser: n.for_user
  }));
}

export async function addNotification(notification: Omit<Notification, 'id'>): Promise<Notification | null> {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      message: notification.message,
      read: notification.read,
      for_user: notification.forUser
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error adding notification:', error);
    return null;
  }
  
  return {
    id: data.id,
    message: data.message,
    read: data.read,
    createdAt: data.created_at,
    forUser: data.for_user
  };
}

export async function markNotificationRead(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id);
  
  if (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
  
  return true;
}

export async function saveNotifications(notifications: Notification[]): Promise<boolean> {
  // This is mainly for compatibility, not typically used
  return true;
}

// Keep old localStorage functions for backward compatibility
export function saveEmployees() {}
export function clearAllData() {
  localStorage.clear();
}

// Projects
export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('Error fetching projects:', error); return []; }
  return data.map(p => ({ id: p.id, name: p.name, assignedTo: p.assigned_to, createdAt: p.created_at }));
}

export async function addProject(project: Omit<Project, 'id'>): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .insert({ name: project.name, assigned_to: project.assignedTo })
    .select()
    .single();
  if (error) { console.error('Error adding project:', error); return null; }
  return { id: data.id, name: data.name, assignedTo: data.assigned_to, createdAt: data.created_at };
}

export async function deleteProject(id: string): Promise<boolean> {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) { console.error('Error deleting project:', error); return false; }
  return true;
}
