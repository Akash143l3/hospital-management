from flask import Flask, request, jsonify, session
from flask_mysqldb import MySQL
import MySQLdb.cursors
import re
from datetime import datetime, date, time, timedelta
import hashlib
import logging
from flask_cors import CORS
import json

app = Flask(__name__)
app.secret_key = 'hospital_management_secret_key_2025'

# Initialize CORS
CORS(app) 

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('hospital_api.log'),
        logging.StreamHandler()
    ]
)

# MySQL Configuration
app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'root'
app.config['MYSQL_PASSWORD'] = 'Akashbr'
app.config['MYSQL_DB'] = 'hospital_management'

mysql = MySQL(app)

# Custom JSON Encoder
class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, date):
            return obj.isoformat()
        if isinstance(obj, time):
            return obj.strftime('%H:%M:%S')
        if isinstance(obj, timedelta):
            # Convert timedelta to time string (HH:MM:SS)
            total_seconds = int(obj.total_seconds())
            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            seconds = total_seconds % 60
            return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        return super().default(obj)

# Set the custom JSON encoder
app.json_encoder = CustomJSONEncoder

# Helper function to serialize data manually
def serialize_data(data):
    """Manually serialize data to handle datetime/timedelta objects"""
    if isinstance(data, dict):
        return {key: serialize_data(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [serialize_data(item) for item in data]
    elif isinstance(data, datetime):
        return data.isoformat()
    elif isinstance(data, date):
        return data.isoformat()
    elif isinstance(data, time):
        return data.strftime('%H:%M:%S')
    elif isinstance(data, timedelta):
        total_seconds = int(data.total_seconds())
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        seconds = total_seconds % 60
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
    else:
        return data

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def log_operation(operation, user_type, data):
    """Log operations to console and file"""
    log_message = f"Operation: {operation} | User Type: {user_type} | Data: {data}"
    app.logger.info(log_message)
    print(f"[{datetime.now()}] {log_message}")

# ==================== AUTHENTICATION ROUTES ====================

@app.route('/api/register', methods=['POST'])
def api_register():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'username', 'password', 'email', 'phone', 'role']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        name = data['name']
        username = data['username']
        password = data['password']
        email = data['email']
        phone = data['phone']
        role = data['role'].lower()
        
        # Validate role
        if role not in ['admin', 'doctor', 'patient']:
            return jsonify({'error': 'Invalid role. Must be admin, doctor, or patient'}), 400
        
        # Validate email format
        if not re.match(r'[^@]+@[^@]+\.[^@]+', email):
            return jsonify({'error': 'Invalid email address'}), 400
        
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        
        # Check if username already exists in any table
        tables = ['admins', 'doctors', 'patients']
        for table in tables:
            cursor.execute(f'SELECT * FROM {table} WHERE username = %s', (username,))
            if cursor.fetchone():
                return jsonify({'error': 'Username already exists'}), 409
        
        hashed_password = hash_password(password)
        
        # Insert based on role
        if role == 'admin':
            cursor.execute('INSERT INTO admins VALUES (NULL, %s, %s, %s, %s, %s, %s)', 
                          (name, username, hashed_password, email, phone, datetime.now()))
        elif role == 'doctor':
            specialization = data.get('specialization', 'General')
            cursor.execute('INSERT INTO doctors VALUES (NULL, %s, %s, %s, %s, %s, %s, %s)', 
                          (name, username, hashed_password, email, phone, specialization, datetime.now()))
        else:  # patient
            address = data.get('address', '')
            cursor.execute('INSERT INTO patients VALUES (NULL, %s, %s, %s, %s, %s, %s, %s)', 
                          (name, username, hashed_password, email, phone, address, datetime.now()))
        
        mysql.connection.commit()
        
        log_operation('REGISTER', role.upper(), {'username': username, 'name': name, 'email': email})
        
        return jsonify({'message': f'{role.capitalize()} registered successfully', 'username': username}), 201
        
    except Exception as e:
        app.logger.error(f"Registration error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/login', methods=['POST'])
def api_login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        user_type = data.get('user_type', '').lower()
        
        if not username or not password or not user_type:
            return jsonify({'error': 'Username, password, and user_type are required'}), 400
        
        if user_type not in ['admin', 'doctor', 'patient']:
            return jsonify({'error': 'Invalid user_type'}), 400
        
        hashed_password = hash_password(password)
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        
        table_map = {'admin': 'admins', 'doctor': 'doctors', 'patient': 'patients'}
        table = table_map[user_type]
        
        cursor.execute(f'SELECT * FROM {table} WHERE username = %s AND password = %s', (username, hashed_password))
        account = cursor.fetchone()
        
        if account:
            session['loggedin'] = True
            session['id'] = account['id']
            session['username'] = account['username']
            session['user_type'] = user_type
            
            log_operation('LOGIN', user_type.upper(), {'username': username, 'id': account['id']})
            
            # Serialize the account data
            serialized_account = serialize_data(account)
            
            return jsonify({
                'message': 'Login successful',
                'user': {
                    'id': serialized_account['id'],
                    'username': serialized_account['username'],
                    'name': serialized_account['name'],
                    'user_type': user_type
                }
            }), 200
        else:
            return jsonify({'error': 'Invalid credentials'}), 401
            
    except Exception as e:
        app.logger.error(f"Login error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/logout', methods=['POST'])
def api_logout():
    user_info = {'username': session.get('username'), 'user_type': session.get('user_type')}
    session.clear()
    log_operation('LOGOUT', user_info.get('user_type', 'UNKNOWN'), user_info)
    return jsonify({'message': 'Logged out successfully'}), 200

# ==================== ADMIN CRUD OPERATIONS ====================

@app.route('/api/admins', methods=['GET'])
def get_all_admins():
    try:
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        cursor.execute('SELECT id, name, username, email, phone, created_at FROM admins ORDER BY name')
        admins = cursor.fetchall()
        
        # Serialize the data
        serialized_admins = serialize_data(admins)
        
        log_operation('GET_ALL', 'ADMIN', {'count': len(admins)})
        return jsonify({'admins': serialized_admins}), 200
        
    except Exception as e:
        app.logger.error(f"Get admins error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/admins/<int:admin_id>', methods=['GET'])
def get_admin(admin_id):
    try:
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        cursor.execute('SELECT id, name, username, email, phone, created_at FROM admins WHERE id = %s', (admin_id,))
        admin = cursor.fetchone()
        
        if not admin:
            return jsonify({'error': 'Admin not found'}), 404
        
        serialized_admin = serialize_data(admin)
        
        log_operation('GET', 'ADMIN', {'id': admin_id})
        return jsonify({'admin': serialized_admin}), 200
        
    except Exception as e:
        app.logger.error(f"Get admin error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/admins/<int:admin_id>', methods=['PUT'])
def update_admin(admin_id):
    try:
        data = request.get_json()
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        
        # Check if admin exists
        cursor.execute('SELECT * FROM admins WHERE id = %s', (admin_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Admin not found'}), 404
        
        # Build update query dynamically
        update_fields = []
        values = []
        
        if 'name' in data:
            update_fields.append('name = %s')
            values.append(data['name'])
        if 'email' in data:
            update_fields.append('email = %s')
            values.append(data['email'])
        if 'phone' in data:
            update_fields.append('phone = %s')
            values.append(data['phone'])
        
        if not update_fields:
            return jsonify({'error': 'No valid fields to update'}), 400
        
        values.append(admin_id)
        query = f"UPDATE admins SET {', '.join(update_fields)} WHERE id = %s"
        
        cursor.execute(query, values)
        mysql.connection.commit()
        
        log_operation('UPDATE', 'ADMIN', {'id': admin_id, 'updated_fields': list(data.keys())})
        return jsonify({'message': 'Admin updated successfully'}), 200
        
    except Exception as e:
        app.logger.error(f"Update admin error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/admins/<int:admin_id>', methods=['DELETE'])
def delete_admin(admin_id):
    try:
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        
        # Check if admin exists
        cursor.execute('SELECT * FROM admins WHERE id = %s', (admin_id,))
        admin = cursor.fetchone()
        if not admin:
            return jsonify({'error': 'Admin not found'}), 404
        
        cursor.execute('DELETE FROM admins WHERE id = %s', (admin_id,))
        mysql.connection.commit()
        
        log_operation('DELETE', 'ADMIN', {'id': admin_id, 'username': admin['username']})
        return jsonify({'message': 'Admin deleted successfully'}), 200
        
    except Exception as e:
        app.logger.error(f"Delete admin error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# ==================== DOCTOR CRUD OPERATIONS ====================

@app.route('/api/doctors', methods=['GET'])
def get_all_doctors():
    try:
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        cursor.execute('SELECT id, name, username, email, phone, specialization, created_at FROM doctors ORDER BY name')
        doctors = cursor.fetchall()
        
        serialized_doctors = serialize_data(doctors)
        
        log_operation('GET_ALL', 'DOCTOR', {'count': len(doctors)})
        return jsonify({'doctors': serialized_doctors}), 200
        
    except Exception as e:
        app.logger.error(f"Get doctors error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/doctors', methods=['POST'])
def create_doctor():
    try:
        data = request.get_json()
        required_fields = ['name', 'username', 'password', 'email', 'phone', 'specialization']
        
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        
        # Check if username exists
        cursor.execute('SELECT * FROM doctors WHERE username = %s', (data['username'],))
        if cursor.fetchone():
            return jsonify({'error': 'Username already exists'}), 409
        
        hashed_password = hash_password(data['password'])
        cursor.execute('INSERT INTO doctors VALUES (NULL, %s, %s, %s, %s, %s, %s, %s)', 
                      (data['name'], data['username'], hashed_password, data['email'], 
                       data['phone'], data['specialization'], datetime.now()))
        mysql.connection.commit()
        
        doctor_id = cursor.lastrowid
        log_operation('CREATE', 'DOCTOR', {'id': doctor_id, 'username': data['username'], 'name': data['name']})
        
        return jsonify({'message': 'Doctor created successfully', 'id': doctor_id}), 201
        
    except Exception as e:
        app.logger.error(f"Create doctor error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/doctors/<int:doctor_id>', methods=['GET'])
def get_doctor(doctor_id):
    try:
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        cursor.execute('SELECT id, name, username, email, phone, specialization, created_at FROM doctors WHERE id = %s', (doctor_id,))
        doctor = cursor.fetchone()
        
        if not doctor:
            return jsonify({'error': 'Doctor not found'}), 404
        
        serialized_doctor = serialize_data(doctor)
        
        log_operation('GET', 'DOCTOR', {'id': doctor_id})
        return jsonify({'doctor': serialized_doctor}), 200
        
    except Exception as e:
        app.logger.error(f"Get doctor error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/doctors/<int:doctor_id>', methods=['PUT'])
def update_doctor(doctor_id):
    try:
        data = request.get_json()
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        
        # Check if doctor exists
        cursor.execute('SELECT * FROM doctors WHERE id = %s', (doctor_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Doctor not found'}), 404
        
        # Build update query dynamically
        update_fields = []
        values = []
        
        allowed_fields = ['name', 'email', 'phone', 'specialization']
        for field in allowed_fields:
            if field in data:
                update_fields.append(f'{field} = %s')
                values.append(data[field])
        
        if not update_fields:
            return jsonify({'error': 'No valid fields to update'}), 400
        
        values.append(doctor_id)
        query = f"UPDATE doctors SET {', '.join(update_fields)} WHERE id = %s"
        
        cursor.execute(query, values)
        mysql.connection.commit()
        
        log_operation('UPDATE', 'DOCTOR', {'id': doctor_id, 'updated_fields': list(data.keys())})
        return jsonify({'message': 'Doctor updated successfully'}), 200
        
    except Exception as e:
        app.logger.error(f"Update doctor error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/doctors/<int:doctor_id>', methods=['DELETE'])
def delete_doctor(doctor_id):
    try:
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        
        # Check if doctor exists
        cursor.execute('SELECT * FROM doctors WHERE id = %s', (doctor_id,))
        doctor = cursor.fetchone()
        if not doctor:
            return jsonify({'error': 'Doctor not found'}), 404
        
        # Check if doctor has appointments
        cursor.execute('SELECT COUNT(*) as count FROM appointments WHERE doctor_id = %s', (doctor_id,))
        appointment_count = cursor.fetchone()['count']
        
        if appointment_count > 0:
            return jsonify({'error': 'Cannot delete doctor with existing appointments'}), 400
        
        cursor.execute('DELETE FROM doctors WHERE id = %s', (doctor_id,))
        mysql.connection.commit()
        
        log_operation('DELETE', 'DOCTOR', {'id': doctor_id, 'username': doctor['username']})
        return jsonify({'message': 'Doctor deleted successfully'}), 200
        
    except Exception as e:
        app.logger.error(f"Delete doctor error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# ==================== PATIENT CRUD OPERATIONS ====================
@app.route('/api/patients', methods=['GET'])
def get_all_patients():
    try:
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        cursor.execute('SELECT id, name, username, email, phone, address, created_at FROM patients ORDER BY name')
        patients = cursor.fetchall()
        
        # Explicitly serialize each patient dictionary
        serialized_patients = [serialize_data(patient) for patient in patients]
        
        log_operation('GET_ALL', 'PATIENT', {'count': len(patients)})
        return jsonify({'patients': serialized_patients}), 200
        
    except Exception as e:
        app.logger.error(f"Get patients error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500
    

@app.route('/api/patients', methods=['POST'])
def create_patient():
    try:
        data = request.get_json()
        required_fields = ['name', 'username', 'password', 'email', 'phone']
        
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        
        # Check if username exists
        cursor.execute('SELECT * FROM patients WHERE username = %s', (data['username'],))
        if cursor.fetchone():
            return jsonify({'error': 'Username already exists'}), 409
        
        hashed_password = hash_password(data['password'])
        address = data.get('address', '')
        
        cursor.execute('INSERT INTO patients VALUES (NULL, %s, %s, %s, %s, %s, %s, %s)', 
                      (data['name'], data['username'], hashed_password, data['email'], 
                       data['phone'], address, datetime.now()))
        mysql.connection.commit()
        
        patient_id = cursor.lastrowid
        log_operation('CREATE', 'PATIENT', {'id': patient_id, 'username': data['username'], 'name': data['name']})
        
        return jsonify({'message': 'Patient created successfully', 'id': patient_id}), 201
        
    except Exception as e:
        app.logger.error(f"Create patient error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/patients/<int:patient_id>', methods=['GET'])
def get_patient(patient_id):
    try:
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        cursor.execute('SELECT id, name, username, email, phone, address, created_at FROM patients WHERE id = %s', (patient_id,))
        patient = cursor.fetchone()
        
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        
        serialized_patient = serialize_data(patient)
        
        log_operation('GET', 'PATIENT', {'id': patient_id})
        return jsonify({'patient': serialized_patient}), 200
        
    except Exception as e:
        app.logger.error(f"Get patient error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/patients/<int:patient_id>', methods=['PUT'])
def update_patient(patient_id):
    try:
        data = request.get_json()
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        
        # Check if patient exists
        cursor.execute('SELECT * FROM patients WHERE id = %s', (patient_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Patient not found'}), 404
        
        # Build update query dynamically
        update_fields = []
        values = []
        
        allowed_fields = ['name', 'email', 'phone', 'address']
        for field in allowed_fields:
            if field in data:
                update_fields.append(f'{field} = %s')
                values.append(data[field])
        
        if not update_fields:
            return jsonify({'error': 'No valid fields to update'}), 400
        
        values.append(patient_id)
        query = f"UPDATE patients SET {', '.join(update_fields)} WHERE id = %s"
        
        cursor.execute(query, values)
        mysql.connection.commit()
        
        log_operation('UPDATE', 'PATIENT', {'id': patient_id, 'updated_fields': list(data.keys())})
        return jsonify({'message': 'Patient updated successfully'}), 200
        
    except Exception as e:
        app.logger.error(f"Update patient error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/patients/<int:patient_id>', methods=['DELETE'])
def delete_patient(patient_id):
    try:
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        
        # Check if patient exists
        cursor.execute('SELECT * FROM patients WHERE id = %s', (patient_id,))
        patient = cursor.fetchone()
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        
        # Check if patient has appointments
        cursor.execute('SELECT COUNT(*) as count FROM appointments WHERE patient_id = %s', (patient_id,))
        appointment_count = cursor.fetchone()['count']
        
        if appointment_count > 0:
            return jsonify({'error': 'Cannot delete patient with existing appointments'}), 400
        
        cursor.execute('DELETE FROM patients WHERE id = %s', (patient_id,))
        mysql.connection.commit()
        
        log_operation('DELETE', 'PATIENT', {'id': patient_id, 'username': patient['username']})
        return jsonify({'message': 'Patient deleted successfully'}), 200
        
    except Exception as e:
        app.logger.error(f"Delete patient error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# ==================== APPOINTMENT OPERATIONS ====================
@app.route('/api/appointments', methods=['GET'])
def get_all_appointments():
    try:
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        cursor.execute('''SELECT a.*, p.name as patient_name, d.name as doctor_name, d.specialization 
                          FROM appointments a 
                          JOIN patients p ON a.patient_id = p.id 
                          JOIN doctors d ON a.doctor_id = d.id 
                          ORDER BY a.appointment_date DESC''')
        appointments = cursor.fetchall()
        
        # Explicitly serialize each appointment dictionary
        serialized_appointments = [serialize_data(appointment) for appointment in appointments]
        
        log_operation('GET_ALL', 'APPOINTMENT', {'count': len(appointments)})
        return jsonify({'appointments': serialized_appointments}), 200
        
    except Exception as e:
        app.logger.error(f"Get appointments error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500
    

@app.route('/api/appointments', methods=['POST'])
def create_appointment():
    try:
        data = request.get_json()
        required_fields = ['patient_id', 'doctor_id', 'appointment_date', 'appointment_time']
        
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        cursor = mysql.connection.cursor()
        symptoms = data.get('symptoms', '')
        
        cursor.execute('INSERT INTO appointments VALUES (NULL, %s, %s, %s, %s, %s, "Scheduled", %s)', 
                      (data['patient_id'], data['doctor_id'], data['appointment_date'], 
                       data['appointment_time'], symptoms, datetime.now()))
        mysql.connection.commit()
        
        appointment_id = cursor.lastrowid
        log_operation('CREATE', 'APPOINTMENT', {
            'id': appointment_id, 
            'patient_id': data['patient_id'], 
            'doctor_id': data['doctor_id'],
            'date': data['appointment_date']
        })
        
        return jsonify({'message': 'Appointment created successfully', 'id': appointment_id}), 201
        
    except Exception as e:
        app.logger.error(f"Create appointment error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/appointments/<int:appointment_id>', methods=['GET'])
def get_appointment(appointment_id):
    try:
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        cursor.execute('''SELECT a.*, p.name as patient_name, d.name as doctor_name, d.specialization 
                          FROM appointments a 
                          JOIN patients p ON a.patient_id = p.id 
                          JOIN doctors d ON a.doctor_id = d.id 
                          WHERE a.id = %s''', (appointment_id,))
        appointment = cursor.fetchone()
        
        if not appointment:
            return jsonify({'error': 'Appointment not found'}), 404
        
        # Explicitly serialize the single appointment dictionary
        serialized_appointment = serialize_data(appointment)
        
        log_operation('GET', 'APPOINTMENT', {'id': appointment_id})
        return jsonify({'appointment': serialized_appointment}), 200
        
    except Exception as e:
        app.logger.error(f"Get appointment error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500
@app.route('/api/appointments/<int:appointment_id>', methods=['PUT'])
def update_appointment(appointment_id):
    try:
        data = request.get_json()
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        
        # Check if appointment exists
        cursor.execute('SELECT * FROM appointments WHERE id = %s', (appointment_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Appointment not found'}), 404
        
        # Build update query dynamically
        update_fields = []
        values = []
        
        allowed_fields = ['appointment_date', 'appointment_time', 'symptoms', 'status']
        for field in allowed_fields:
            if field in data:
                update_fields.append(f'{field} = %s')
                values.append(data[field])
        
        if not update_fields:
            return jsonify({'error': 'No valid fields to update'}), 400
        
        values.append(appointment_id)
        query = f"UPDATE appointments SET {', '.join(update_fields)} WHERE id = %s"
        
        cursor.execute(query, values)
        mysql.connection.commit()
        
        log_operation('UPDATE', 'APPOINTMENT', {'id': appointment_id, 'updated_fields': list(data.keys())})
        return jsonify({'message': 'Appointment updated successfully'}), 200
        
    except Exception as e:
        app.logger.error(f"Update appointment error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/appointments/<int:appointment_id>', methods=['DELETE'])
def delete_appointment(appointment_id):
    try:
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        
        # Check if appointment exists
        cursor.execute('SELECT * FROM appointments WHERE id = %s', (appointment_id,))
        appointment = cursor.fetchone()
        if not appointment:
            return jsonify({'error': 'Appointment not found'}), 404
        
        cursor.execute('DELETE FROM appointments WHERE id = %s', (appointment_id,))
        mysql.connection.commit()
        
        log_operation('DELETE', 'APPOINTMENT', {'id': appointment_id})
        return jsonify({'message': 'Appointment deleted successfully'}), 200
        
    except Exception as e:
        app.logger.error(f"Delete appointment error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# ==================== DASHBOARD STATISTICS ====================

@app.route('/api/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    try:
        cursor = mysql.connection.cursor(MySQLdb.cursors.DictCursor)
        
        # Get statistics
        cursor.execute('SELECT COUNT(*) as count FROM patients')
        total_patients = cursor.fetchone()['count']
        
        cursor.execute('SELECT COUNT(*) as count FROM doctors')
        total_doctors = cursor.fetchone()['count']
        
        cursor.execute('SELECT COUNT(*) as count FROM admins')
        total_admins = cursor.fetchone()['count']
        
        cursor.execute('SELECT COUNT(*) as count FROM appointments WHERE DATE(appointment_date) = CURDATE()')
        today_appointments = cursor.fetchone()['count']
        
        cursor.execute('SELECT COUNT(*) as count FROM appointments')
        total_appointments = cursor.fetchone()['count']
        
        stats = {
            'total_patients': total_patients,
            'total_doctors': total_doctors,
            'total_admins': total_admins,
            'today_appointments': today_appointments,
            'total_appointments': total_appointments
        }
        
        log_operation('GET_STATS', 'DASHBOARD', stats)
        return jsonify({'stats': stats}), 200
        
    except Exception as e:
        app.logger.error(f"Get stats error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# ==================== ERROR HANDLERS ====================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({'error': 'Method not allowed'}), 405

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

# ==================== MAIN ====================

if __name__ == '__main__':
    print("="*60)
    print("Hospital Management API Starting...")
    print("="*60)
    print("Available Endpoints:")
    print("Authentication:")
    print("    POST /api/register - Register new user (admin/doctor/patient)")
    print("    POST /api/login - User login")
    print("    POST /api/logout - User logout")
    print("\nAdmin CRUD:")
    print("    GET /api/admins - Get all admins")
    print("    GET /api/admins/<id> - Get specific admin")
    print("    PUT /api/admins/<id> - Update admin")
    print("    DELETE /api/admins/<id> - Delete admin")
    print("\nDoctor CRUD:")
    print("    GET /api/doctors - Get all doctors")
    print("    POST /api/doctors - Create new doctor")
    print("    GET /api/doctors/<id> - Get specific doctor")
    print("    PUT /api/doctors/<id> - Update doctor")
    print("    DELETE /api/doctors/<id> - Delete doctor")
    print("\nPatient CRUD:")
    print("    GET /api/patients - Get all patients")
    print("    POST /api/patients - Create new patient")
    print("    GET /api/patients/<id> - Get specific patient")
    print("    PUT /api/patients/<id> - Update patient")
    print("    DELETE /api/patients/<id> - Delete patient")
    print("\nAppointment CRUD:")
    print("    GET /api/appointments - Get all appointments")
    print("    POST /api/appointments - Create new appointment")
    print("    PUT /api/appointments/<id> - Update appointment")
    print("    DELETE /api/appointments/<id> - Delete appointment")
    print("\nDashboard:")
    print("    GET /api/dashboard/stats - Get dashboard statistics")
    print("="*60)
    
    app.run(debug=True, host='0.0.0.0')
