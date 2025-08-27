import { NextRequest, NextResponse } from 'next/server';
import { JSONExporter, ExportData } from '@/lib/export';
import { CSVExporter } from '@/lib/csv-export';
import { DualExportResult } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { customer, wifi, macAddress, ipAddress = '192.168.4.1' } = await request.json();
    
    console.log('info: Starting dual export process (JSON + CSV)...');
    
    // Prepare export data
    const exportData: ExportData = {
      customer,
      wifi,
      esp32: {
        macAddress,
        ipAddress
      },
      deployment: {
        timestamp: new Date().toISOString(),
        toolVersion: '1.0.0'
      }
    };

    // Dual export: JSON (individual) + CSV (daily batch) in parallel
    console.log('info: Running JSON and CSV export in parallel...');
    
    const [jsonResult, csvResult] = await Promise.allSettled([
      // JSON Export (existing functionality)
      (async () => {
        const filePath = await JSONExporter.exportCustomerData(exportData);
        const isValid = await JSONExporter.validateExportFile(filePath);
        
        if (!isValid) {
          throw new Error('JSON export validation failed');
        }
        
        return {
          success: true,
          filePath,
          filename: filePath.split('/').pop() || 'unknown'
        };
      })(),
      
      // CSV Export (new functionality)
      CSVExporter.exportDailyCSV(exportData)
    ]);

    // Process results
    let jsonExportResult: DualExportResult['json'];
    let csvExportResult: DualExportResult['csv'];
    
    if (jsonResult.status === 'fulfilled') {
      jsonExportResult = jsonResult.value;
      console.log('info: JSON export completed successfully');
    } else {
      jsonExportResult = {
        success: false,
        filePath: '',
        filename: '',
        error: jsonResult.reason instanceof Error ? jsonResult.reason.message : 'JSON export failed'
      };
      console.error('error: JSON export failed:', jsonResult.reason);
    }
    
    if (csvResult.status === 'fulfilled') {
      csvExportResult = csvResult.value;
      if (csvExportResult.success) {
        console.log('info: CSV export completed successfully');
      } else {
        console.error('error: CSV export failed:', csvExportResult.error);
      }
    } else {
      csvExportResult = {
        success: false,
        filePath: '',
        filename: '',
        isNewFile: false,
        rowsTotal: 0,
        error: csvResult.reason instanceof Error ? csvResult.reason.message : 'CSV export failed'
      };
      console.error('error: CSV export failed:', csvResult.reason);
    }

    // Determine overall success
    const overallSuccess = jsonExportResult.success && csvExportResult.success;
    
    console.log(`info: Dual export completed - JSON: ${jsonExportResult.success ? 'success' : 'failed'}, CSV: ${csvExportResult.success ? 'success' : 'failed'}`);
    
    const dualResult: DualExportResult = {
      json: jsonExportResult,
      csv: csvExportResult
    };
    
    return NextResponse.json({
      success: overallSuccess,
      exports: dualResult,
      exportData,
      message: overallSuccess 
        ? 'Customer data exported successfully to both JSON and CSV formats' 
        : 'Export completed with some errors - check individual export status'
    });
    
  } catch (error) {
    console.error('error: Dual export failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      exports: {
        json: { success: false, filePath: '', filename: '', error: 'Export process failed' },
        csv: { success: false, filePath: '', filename: '', isNewFile: false, rowsTotal: 0, error: 'Export process failed' }
      }
    }, { status: 500 });
  }
}