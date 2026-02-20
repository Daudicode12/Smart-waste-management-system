import { supabase } from '../config/supabase.js';
import { v4 as uuidv4 } from 'uuid';

// controller function to receive sensor data from devices
  const receiveSensorData = async (req, res) =>{
    try{
        const { binId, fillLevel, timestamp, wasteType, moisture, gasLevel, temperature } = req.body;

        // validate required fields
        if(!binId || fillLevel === undefined || !timestamp){
            return res.status(400).json({ error: 'binId, fillLevel, and timestamp are required' });
        }

       const {data, error} = await supabase
       .from('sensor_readings')
       .insert([
        {
            id: uuidv4(),
            bin_id: binId,
            fill_level: fillLevel,
            timestamp: timestamp,
            waste_type: wasteType,
            moisture: moisture,
            gas_level: gasLevel,
            temperature: temperature,
            recorded_at: new Date().toISOString()
        }
       ]);

       if(error){
        return res.status(500).json({ error: error.message });
       }
    //    alert logic added based on fill level
       if(fillLevel >= 80){
        // logic to send alert to waste management team
        await supabase
        .from('alerts')
        .insert([{
            id: uuidv4(),
            bin_id,
            severity: fill_level >= 90 ? 'high' : 'medium',
            message: `Bin ${binId} is ${fillLevel}% full. Immediate attention required!`,
            resolved: false,
            created_at: new Date().toISOString()
        }])
       }
       res.status(200).json({ message: 'Sensor data received successfully', data });
    } catch(error){
        console.error('Error receiving sensor data:', error.message);
        res.status(500).json({ error: 'Failed to receive sensor data' });
    }
}

export { receiveSensorData };