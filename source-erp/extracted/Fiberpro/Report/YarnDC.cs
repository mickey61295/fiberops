using System;
using System.Drawing;
using System.Windows.Forms;
using System.Data;
using Stimulsoft.Controls;
using Stimulsoft.Base.Drawing;
using Stimulsoft.Report;
using Stimulsoft.Report.Dialogs;
using Stimulsoft.Report.Components;

namespace Reports
{
    
    public class Report : Stimulsoft.Report.StiReport
    {
        
        public Report()
        {
            this.InitializeComponent();
        }
        #region StiReport Designer generated code - do not modify
        public Stimulsoft.Report.Components.StiPage Page1;
        public Stimulsoft.Report.Components.StiPageHeaderBand PageHeader1;
        public Stimulsoft.Report.Components.StiText Text1;
        public Stimulsoft.Report.Components.StiText Text2;
        public Stimulsoft.Report.Components.StiText Text3;
        public Stimulsoft.Report.Components.StiText Text4;
        public Stimulsoft.Report.Components.StiText Text5;
        public Stimulsoft.Report.Components.StiText Text6;
        public Stimulsoft.Report.Components.StiText Text7;
        public Stimulsoft.Report.Components.StiText Text8;
        public Stimulsoft.Report.Components.StiText Text9;
        public Stimulsoft.Report.Components.StiText Text10;
        public Stimulsoft.Report.Components.StiText Text11;
        public Stimulsoft.Report.Components.StiText Text12;
        public Stimulsoft.Report.Components.StiText Text13;
        public Stimulsoft.Report.Components.StiText Text14;
        public Stimulsoft.Report.Components.StiText Text15;
        public Stimulsoft.Report.Components.StiText Text16;
        public Stimulsoft.Report.Components.StiText Text17;
        public Stimulsoft.Report.Components.StiText Text18;
        public Stimulsoft.Report.Components.StiText Text19;
        public Stimulsoft.Report.Components.StiText Text20;
        public Stimulsoft.Report.Components.StiText Text21;
        public Stimulsoft.Report.Components.StiText Text22;
        public Stimulsoft.Report.Components.StiText Text23;
        public Stimulsoft.Report.Components.StiText Text24;
        public Stimulsoft.Report.Components.StiText Text25;
        public Stimulsoft.Report.Components.StiText Text26;
        public Stimulsoft.Report.Components.StiHorizontalLinePrimitive HorizontalLine1;
        public Stimulsoft.Report.Components.StiHorizontalLinePrimitive HorizontalLine2;
        public Stimulsoft.Report.Components.StiStartPointPrimitive StartPointPrimitive1;
        public Stimulsoft.Report.Components.StiEndPointPrimitive EndPointPrimitive1;
        public Stimulsoft.Report.Components.StiHorizontalLinePrimitive HorizontalLine5;
        public Stimulsoft.Report.Components.StiPageHeaderBand PageHeader2;
        public Stimulsoft.Report.Components.StiText Text27;
        public Stimulsoft.Report.Components.StiText Text28;
        public Stimulsoft.Report.Components.StiText Text29;
        public Stimulsoft.Report.Components.StiText Text30;
        public Stimulsoft.Report.Components.StiText Text31;
        public Stimulsoft.Report.Components.StiText Text32;
        public Stimulsoft.Report.Components.StiHorizontalLinePrimitive HorizontalLine3;
        public Stimulsoft.Report.Components.StiPageFooterBand PageFooter1;
        public Stimulsoft.Report.Components.StiText Text68;
        public Stimulsoft.Report.Components.StiText Text69;
        public Stimulsoft.Report.Components.StiText Text74;
        public Stimulsoft.Report.Components.StiText Text75;
        public Stimulsoft.Report.Components.StiText Text76;
        public Stimulsoft.Report.Components.StiText Text77;
        public Stimulsoft.Report.Components.StiText Text70;
        public Stimulsoft.Report.Components.StiHorizontalLinePrimitive HorizontalLine13;
        public Stimulsoft.Report.Components.StiEndPointPrimitive EndPointPrimitive2;
        public Stimulsoft.Report.Components.StiDataBand Data1;
        public Stimulsoft.Report.Components.StiText Text33;
        public Stimulsoft.Report.Components.StiText Text34;
        public Stimulsoft.Report.Components.StiText Text35;
        public Stimulsoft.Report.Components.StiText Text36;
        public Stimulsoft.Report.Components.StiText Text37;
        public Stimulsoft.Report.Components.StiText Text38;
        public Stimulsoft.Report.Components.StiFooterBand Footer4;
        public Stimulsoft.Report.Components.StiText Text64;
        public Stimulsoft.Report.Dictionary.StiSumDecimalFunctionService Text64_Sum;
        public Stimulsoft.Report.Components.StiText Text67;
        public Stimulsoft.Report.Dictionary.StiSumDecimalFunctionService Text67_Sum;
        public Stimulsoft.Report.Components.StiText Text66;
        public Stimulsoft.Report.Components.StiHorizontalLinePrimitive HorizontalLine11;
        public Stimulsoft.Report.Components.StiFooterBand Footer1;
        public Stimulsoft.Report.Components.StiSubReport SubReportYarn;
        public Stimulsoft.Report.Components.StiSubReport SubReportFabric;
        public Stimulsoft.Report.Components.StiVerticalLinePrimitive VerticalLine1;
        public Stimulsoft.Report.Components.StiRectanglePrimitive Rectangle1;
        public Stimulsoft.Report.Components.StiStartPointPrimitive StartPointPrimitive2;
        public Stimulsoft.Report.Components.StiWatermark Page1_Watermark;
        public Stimulsoft.Report.Components.StiPage Sub_Report_2;
        public Stimulsoft.Report.Components.StiHeaderBand Header1;
        public Stimulsoft.Report.Components.StiText Text39;
        public Stimulsoft.Report.Components.StiText Text40;
        public Stimulsoft.Report.Components.StiText Text41;
        public Stimulsoft.Report.Components.StiText Text42;
        public Stimulsoft.Report.Components.StiHorizontalLinePrimitive HorizontalLine4;
        public Stimulsoft.Report.Components.StiHorizontalLinePrimitive HorizontalLine6;
        public Stimulsoft.Report.Components.StiDataBand Data2;
        public Stimulsoft.Report.Components.StiText Text43;
        public Stimulsoft.Report.Components.StiText Text44;
        public Stimulsoft.Report.Components.StiText Text45;
        public Stimulsoft.Report.Components.StiFooterBand Footer2;
        public Stimulsoft.Report.Components.StiText Text46;
        public Stimulsoft.Report.Dictionary.StiSumDecimalFunctionService Text46_Sum;
        public Stimulsoft.Report.Components.StiHorizontalLinePrimitive HorizontalLine7;
        public Stimulsoft.Report.Components.StiWatermark Sub_Report_2_Watermark;
        public Stimulsoft.Report.Components.StiPage Sub_Report_1;
        public Stimulsoft.Report.Components.StiHeaderBand Header2;
        public Stimulsoft.Report.Components.StiText Text47;
        public Stimulsoft.Report.Components.StiText Text48;
        public Stimulsoft.Report.Components.StiText Text49;
        public Stimulsoft.Report.Components.StiText Text50;
        public Stimulsoft.Report.Components.StiText Text51;
        public Stimulsoft.Report.Components.StiText Text52;
        public Stimulsoft.Report.Components.StiText Text53;
        public Stimulsoft.Report.Components.StiText Text54;
        public Stimulsoft.Report.Components.StiHorizontalLinePrimitive HorizontalLine8;
        public Stimulsoft.Report.Components.StiHorizontalLinePrimitive HorizontalLine9;
        public Stimulsoft.Report.Components.StiDataBand Data3;
        public Stimulsoft.Report.Components.StiText Text55;
        public Stimulsoft.Report.Components.StiText Text56;
        public Stimulsoft.Report.Components.StiText Text57;
        public Stimulsoft.Report.Components.StiText Text58;
        public Stimulsoft.Report.Components.StiText Text59;
        public Stimulsoft.Report.Components.StiText Text60;
        public Stimulsoft.Report.Components.StiText Text61;
        public Stimulsoft.Report.Components.StiText Text62;
        public Stimulsoft.Report.Components.StiFooterBand Footer3;
        public Stimulsoft.Report.Components.StiText Text63;
        public Stimulsoft.Report.Dictionary.StiSumDecimalFunctionService Text63_Sum;
        public Stimulsoft.Report.Components.StiText Text65;
        public Stimulsoft.Report.Dictionary.StiSumDecimalFunctionService Text65_Sum;
        public Stimulsoft.Report.Components.StiHorizontalLinePrimitive HorizontalLine10;
        public Stimulsoft.Report.Components.StiWatermark Sub_Report_1_Watermark;
        public Stimulsoft.Report.Print.StiPrinterSettings Report_PrinterSettings;
        public YarnDCDataSource YarnDC;
        public YarnSubReportDataSource YarnSubReport;
        public FabricsubReportDataSource FabricsubReport;
        
        public void Text1__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, YarnDC.Heading, true) + " " + ToString(sender, YarnDC.Deptname, true);
        }
        
        public void Text2__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, Today, true);
        }
        
        public void Text3__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = this.Text3.TextFormat.Format(CheckExcelValue(sender, Time));
        }
        
        public void Text4__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, YarnDC.ExporterName, true);
        }
        
        public void Text5__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, YarnDC.ExporterAddress, true);
        }
        
        public void Text6__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, YarnDC.Expr2, true);
        }
        
        public void Text7__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, YarnDC.Expr3, true);
        }
        
        public void Text8__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "Phone :";
        }
        
        public void Text9__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "TIN   :";
        }
        
        public void Text10__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "CST   :";
        }
        
        public void Text11__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, YarnDC.Expr4, true);
        }
        
        public void Text12__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, YarnDC.Pname, true);
        }
        
        public void Text13__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "To M/S";
        }
        
        public void Text14__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, YarnDC.Paddress, true);
        }
        
        public void Text15__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "Phone :";
        }
        
        public void Text16__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "TIN   :";
        }
        
        public void Text17__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "CST   :";
        }
        
        public void Text18__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, YarnDC.Phone, true);
        }
        
        public void Text19__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, YarnDC.TIN, true);
        }
        
        public void Text20__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, YarnDC.CST, true);
        }
        
        public void Text21__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "DC NO :";
        }
        
        public void Text22__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, YarnDC.DcNo, true);
        }
        
        public void Text23__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "Date :";
        }
        
        public void Text24__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = this.Text24.TextFormat.Format(CheckExcelValue(sender, YarnDC.Dt));
        }
        
        public void Text25__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "Order No:";
        }
        
        public void Text26__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, YarnDC.OrderNo, true);
        }
        
        public void Text27__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "Slno";
        }
        
        public void Text28__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "YARN COUNT";
        }
        
        public void Text29__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "COLOR";
        }
        
        public void Text30__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "MILL";
        }
        
        public void Text31__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "BAGS";
        }
        
        public void Text32__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "KGS";
        }
        
        public void Text68__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "Remarks :";
        }
        
        public void Text69__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, YarnDC.remark, true);
        }
        
        public void Text74__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "Receiver\'s Signature";
        }
        
        public void Text75__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "Prepared By";
        }
        
        public void Text76__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "Verified By";
        }
        
        public void Text77__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "Authorised Signatory";
        }
        
        public void Text70__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "For " + ToString(sender, YarnDC.ExporterName, true);
        }
        
        public void Text33__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, Line, true);
        }
        
        public void Text34__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, YarnDC.CountName, true);
        }
        
        public void Text35__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, YarnDC.ColorDesc, true);
        }
        
        public void Text36__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, YarnDC.Mill, true);
        }
        
        public void Text37__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, YarnDC.BgRl, true);
        }
        
        public void Text38__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, YarnDC.Kg, true);
        }
        
        public void Text64__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "#%#{Sum(YarnDC.Kg)}";
            e.StoreToPrinted = true;
        }
        
        public System.String Text64_GetValue_End(Stimulsoft.Report.Components.StiComponent sender)
        {
            return ToString(sender, ((decimal)(StiReport.ChangeType(this.Text64_Sum.GetValue(), typeof(decimal), true))), true);
        }
        
        public void Text67__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "#%#{Sum(YarnDC.BgRl)}";
            e.StoreToPrinted = true;
        }
        
        public System.String Text67_GetValue_End(Stimulsoft.Report.Components.StiComponent sender)
        {
            return ToString(sender, ((decimal)(StiReport.ChangeType(this.Text67_Sum.GetValue(), typeof(decimal), true))), true);
        }
        
        public void Text66__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "TOTAL";
        }
        
        public void Text39__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "PROGRAM DETAILS";
        }
        
        public void Text40__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "COUNT";
        }
        
        public void Text41__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "COLOR";
        }
        
        public void Text42__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "KGS";
        }
        
        public void Text43__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, YarnSubReport.CountName, true);
        }
        
        public void Text44__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, YarnSubReport.ColorDesc, true);
        }
        
        public void Text45__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, YarnSubReport.Prog, true);
        }
        
        public void Text46__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "#%#{Sum(YarnSubReport.Prog)}";
            e.StoreToPrinted = true;
        }
        
        public System.String Text46_GetValue_End(Stimulsoft.Report.Components.StiComponent sender)
        {
            return ToString(sender, ((decimal)(StiReport.ChangeType(this.Text46_Sum.GetValue(), typeof(decimal), true))), true);
        }
        
        public void Text47__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "PROGRAM DETAILS";
        }
        
        public void Text48__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "FABRIC DESCRIPTION";
        }
        
        public void Text49__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "GSM";
        }
        
        public void Text50__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "GG";
        }
        
        public void Text51__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "LL";
        }
        
        public void Text52__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "DIA";
        }
        
        public void Text53__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "KGS";
        }
        
        public void Text54__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "OTHER UOM";
        }
        
        public void Text55__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, FabricsubReport.ItemDesc, true);
        }
        
        public void Text56__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = this.Text56.TextFormat.Format(CheckExcelValue(sender, FabricsubReport.Gsm));
        }
        
        public void Text57__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, FabricsubReport.GG, true);
        }
        
        public void Text58__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, FabricsubReport.LL, true);
        }
        
        public void Text59__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, FabricsubReport.Dia, true);
        }
        
        public void Text60__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, FabricsubReport.Prog, true);
        }
        
        public void Text61__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, FabricsubReport.ProgMtr, true);
        }
        
        public void Text62__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, FabricsubReport.Uom, true);
        }
        
        public void Text63__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "#%#{Sum(FabricsubReport.Prog)}";
            e.StoreToPrinted = true;
        }
        
        public System.String Text63_GetValue_End(Stimulsoft.Report.Components.StiComponent sender)
        {
            return ToString(sender, ((decimal)(StiReport.ChangeType(this.Text63_Sum.GetValue(), typeof(decimal), true))), true);
        }
        
        public void Text65__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "#%#{Sum(FabricsubReport.ProgMtr)}";
            e.StoreToPrinted = true;
        }
        
        public System.String Text65_GetValue_End(Stimulsoft.Report.Components.StiComponent sender)
        {
            return ToString(sender, ((decimal)(StiReport.ChangeType(this.Text65_Sum.GetValue(), typeof(decimal), true))), true);
        }
        
        public void Data1__BeginRender(object sender, System.EventArgs e)
        {
            this.Text64_Sum.Init();
            this.Text64.TextValue = "";
            this.Text67_Sum.Init();
            this.Text67.TextValue = "";
        }
        
        public void Data1__EndRender(object sender, System.EventArgs e)
        {
            this.Text64.SetText(new Stimulsoft.Report.Components.StiGetValue(this.Text64_GetValue_End));
            this.Text67.SetText(new Stimulsoft.Report.Components.StiGetValue(this.Text67_GetValue_End));
        }
        
        public void Data2__BeginRender(object sender, System.EventArgs e)
        {
            this.Text46_Sum.Init();
            this.Text46.TextValue = "";
        }
        
        public void Data2__EndRender(object sender, System.EventArgs e)
        {
            this.Text46.SetText(new Stimulsoft.Report.Components.StiGetValue(this.Text46_GetValue_End));
        }
        
        public void Data3__BeginRender(object sender, System.EventArgs e)
        {
            this.Text63_Sum.Init();
            this.Text63.TextValue = "";
            this.Text65_Sum.Init();
            this.Text65.TextValue = "";
        }
        
        public void Data3__EndRender(object sender, System.EventArgs e)
        {
            this.Text63.SetText(new Stimulsoft.Report.Components.StiGetValue(this.Text63_GetValue_End));
            this.Text65.SetText(new Stimulsoft.Report.Components.StiGetValue(this.Text65_GetValue_End));
        }
        
        public void Data1__Rendering(object sender, System.EventArgs e)
        {
            this.Text64_Sum.CalcItem(YarnDC.Kg);
            this.Text67_Sum.CalcItem(YarnDC.BgRl);
        }
        
        public void Data2__Rendering(object sender, System.EventArgs e)
        {
            this.Text46_Sum.CalcItem(YarnSubReport.Prog);
        }
        
        public void Data3__Rendering(object sender, System.EventArgs e)
        {
            this.Text63_Sum.CalcItem(FabricsubReport.Prog);
            this.Text65_Sum.CalcItem(FabricsubReport.ProgMtr);
        }
        
        private void InitializeComponent()
        {
            this.FabricsubReport = new FabricsubReportDataSource();
            this.YarnSubReport = new YarnSubReportDataSource();
            this.YarnDC = new YarnDCDataSource();
            this.NeedsCompiling = false;
            this.Text65_Sum = new Stimulsoft.Report.Dictionary.StiSumDecimalFunctionService();
            this.Text63_Sum = new Stimulsoft.Report.Dictionary.StiSumDecimalFunctionService();
            this.Text46_Sum = new Stimulsoft.Report.Dictionary.StiSumDecimalFunctionService();
            this.Text67_Sum = new Stimulsoft.Report.Dictionary.StiSumDecimalFunctionService();
            this.Text64_Sum = new Stimulsoft.Report.Dictionary.StiSumDecimalFunctionService();
            this.EngineVersion = Stimulsoft.Report.Engine.StiEngineVersion.EngineV2;
            this.ReferencedAssemblies = new System.String[] {
                    "System.Dll",
                    "System.Drawing.Dll",
                    "System.Windows.Forms.Dll",
                    "System.Data.Dll",
                    "System.Xml.Dll",
                    "Stimulsoft.Controls.Dll",
                    "Stimulsoft.Base.Dll",
                    "Stimulsoft.Report.Dll"};
            this.ReportAlias = "Report";
            // 
            // ReportChanged
            // 
            this.ReportChanged = new DateTime(2009, 8, 1, 16, 8, 11, 703);
            // 
            // ReportCreated
            // 
            this.ReportCreated = new DateTime(2009, 7, 30, 17, 28, 18, 0);
            this.ReportGuid = "9c92ae9fb5434071a56c4ecdf8503963";
            this.ReportName = "Report";
            this.ReportUnit = Stimulsoft.Report.StiReportUnitType.Inches;
            this.ScriptLanguage = Stimulsoft.Report.StiReportLanguageType.CSharp;
            // 
            // Page1
            // 
            this.Page1 = new Stimulsoft.Report.Components.StiPage();
            this.Page1.Guid = "64e204640c8947788ec7d5f202e0beee";
            this.Page1.Name = "Page1";
            this.Page1.PageHeight = 6.3;
            this.Page1.PageWidth = 8.27;
            this.Page1.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 2, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Page1.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            // 
            // PageHeader1
            // 
            this.PageHeader1 = new Stimulsoft.Report.Components.StiPageHeaderBand();
            this.PageHeader1.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 0.2, 7.49, 2);
            this.PageHeader1.Name = "PageHeader1";
            this.PageHeader1.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.PageHeader1.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            // 
            // Text1
            // 
            this.Text1 = new Stimulsoft.Report.Components.StiText();
            this.Text1.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(1.7, 0, 3.7, 0.2);
            this.Text1.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Center;
            this.Text1.Name = "Text1";
            this.Text1.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text1__GetValue);
            this.Text1.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text1.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text1.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text1.Font = new System.Drawing.Font("Courier New", 11F, System.Drawing.FontStyle.Bold);
            this.Text1.Guid = null;
            this.Text1.Interaction = null;
            this.Text1.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text1.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text1.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text2
            // 
            this.Text2 = new Stimulsoft.Report.Components.StiText();
            this.Text2.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(5.7, 0, 1, 0.2);
            this.Text2.Name = "Text2";
            this.Text2.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text2__GetValue);
            this.Text2.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text2.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text2.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text2.Guid = null;
            this.Text2.Interaction = null;
            this.Text2.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text2.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text2.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text3
            // 
            this.Text3 = new Stimulsoft.Report.Components.StiText();
            this.Text3.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(6.7, 0, 0.7, 0.2);
            this.Text3.Name = "Text3";
            this.Text3.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text3__GetValue);
            this.Text3.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text3.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text3.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text3.Guid = null;
            this.Text3.Interaction = null;
            this.Text3.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text3.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text3.TextFormat = new Stimulsoft.Report.Components.TextFormats.StiTimeFormatService("t");
            this.Text3.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text4
            // 
            this.Text4 = new Stimulsoft.Report.Components.StiText();
            this.Text4.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 0.2, 3.3, 0.2);
            this.Text4.Name = "Text4";
            this.Text4.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text4__GetValue);
            this.Text4.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text4.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text4.Font = new System.Drawing.Font("Courier New", 10F, System.Drawing.FontStyle.Bold);
            this.Text4.Guid = null;
            this.Text4.Interaction = null;
            this.Text4.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text4.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text4.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text5
            // 
            this.Text5 = new Stimulsoft.Report.Components.StiText();
            this.Text5.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 0.4, 3.3, 0.8);
            this.Text5.Name = "Text5";
            this.Text5.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text5__GetValue);
            this.Text5.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text5.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text5.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text5.Guid = null;
            this.Text5.Interaction = null;
            this.Text5.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text5.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text5.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text6
            // 
            this.Text6 = new Stimulsoft.Report.Components.StiText();
            this.Text6.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0.6, 1.2, 2.7, 0.2);
            this.Text6.Name = "Text6";
            this.Text6.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text6__GetValue);
            this.Text6.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text6.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text6.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text6.Guid = null;
            this.Text6.Interaction = null;
            this.Text6.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text6.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text6.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text7
            // 
            this.Text7 = new Stimulsoft.Report.Components.StiText();
            this.Text7.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0.6, 1.4, 2.7, 0.2);
            this.Text7.Name = "Text7";
            this.Text7.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text7__GetValue);
            this.Text7.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text7.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text7.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text7.Guid = null;
            this.Text7.Interaction = null;
            this.Text7.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text7.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text7.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text8
            // 
            this.Text8 = new Stimulsoft.Report.Components.StiText();
            this.Text8.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 1.2, 0.7, 0.2);
            this.Text8.Name = "Text8";
            this.Text8.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text8__GetValue);
            this.Text8.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text8.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text8.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text8.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text8.Guid = null;
            this.Text8.Interaction = null;
            this.Text8.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text8.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text8.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text9
            // 
            this.Text9 = new Stimulsoft.Report.Components.StiText();
            this.Text9.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 1.4, 0.6, 0.2);
            this.Text9.Guid = "8038120fd9fd45cfafc6560a4f1a40b6";
            this.Text9.Name = "Text9";
            this.Text9.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text9__GetValue);
            this.Text9.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text9.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text9.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text9.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text9.Interaction = null;
            this.Text9.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text9.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text9.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text10
            // 
            this.Text10 = new Stimulsoft.Report.Components.StiText();
            this.Text10.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 1.6, 0.6, 0.2);
            this.Text10.Guid = "4868b9917ef7438f81be1444d00f09ea";
            this.Text10.Name = "Text10";
            this.Text10.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text10__GetValue);
            this.Text10.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text10.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text10.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text10.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text10.Interaction = null;
            this.Text10.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text10.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text10.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text11
            // 
            this.Text11 = new Stimulsoft.Report.Components.StiText();
            this.Text11.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0.6, 1.6, 2.7, 0.2);
            this.Text11.Name = "Text11";
            this.Text11.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text11__GetValue);
            this.Text11.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text11.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text11.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text11.Guid = null;
            this.Text11.Interaction = null;
            this.Text11.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text11.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text11.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text12
            // 
            this.Text12 = new Stimulsoft.Report.Components.StiText();
            this.Text12.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(4, 0.2, 3.4, 0.2);
            this.Text12.Name = "Text12";
            this.Text12.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text12__GetValue);
            this.Text12.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text12.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text12.Font = new System.Drawing.Font("Courier New", 10F, System.Drawing.FontStyle.Bold);
            this.Text12.Guid = null;
            this.Text12.Interaction = null;
            this.Text12.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text12.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text12.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text13
            // 
            this.Text13 = new Stimulsoft.Report.Components.StiText();
            this.Text13.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(3.4, 0.2, 0.6, 0.2);
            this.Text13.Name = "Text13";
            this.Text13.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text13__GetValue);
            this.Text13.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text13.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text13.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text13.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text13.Guid = null;
            this.Text13.Interaction = null;
            this.Text13.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text13.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text13.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text14
            // 
            this.Text14 = new Stimulsoft.Report.Components.StiText();
            this.Text14.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(4, 0.4, 3.4, 0.8);
            this.Text14.Name = "Text14";
            this.Text14.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text14__GetValue);
            this.Text14.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text14.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text14.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text14.Guid = null;
            this.Text14.Interaction = null;
            this.Text14.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text14.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text14.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text15
            // 
            this.Text15 = new Stimulsoft.Report.Components.StiText();
            this.Text15.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(4, 1.2, 0.7, 0.2);
            this.Text15.Guid = "147364318b98447c923ec9f5f7a19ba5";
            this.Text15.Name = "Text15";
            this.Text15.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text15__GetValue);
            this.Text15.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text15.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text15.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text15.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text15.Interaction = null;
            this.Text15.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text15.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text15.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text16
            // 
            this.Text16 = new Stimulsoft.Report.Components.StiText();
            this.Text16.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(4, 1.4, 0.6, 0.2);
            this.Text16.Guid = "44c78b40bd644d8da868f6b8714177b2";
            this.Text16.Name = "Text16";
            this.Text16.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text16__GetValue);
            this.Text16.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text16.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text16.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text16.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text16.Interaction = null;
            this.Text16.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text16.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text16.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text17
            // 
            this.Text17 = new Stimulsoft.Report.Components.StiText();
            this.Text17.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(4, 1.6, 0.6, 0.2);
            this.Text17.Guid = "c91be257981842b88ba452196965b845";
            this.Text17.Name = "Text17";
            this.Text17.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text17__GetValue);
            this.Text17.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text17.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text17.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text17.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text17.Interaction = null;
            this.Text17.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text17.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text17.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text18
            // 
            this.Text18 = new Stimulsoft.Report.Components.StiText();
            this.Text18.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(4.7, 1.2, 2.7, 0.2);
            this.Text18.Name = "Text18";
            this.Text18.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text18__GetValue);
            this.Text18.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text18.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text18.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text18.Guid = null;
            this.Text18.Interaction = null;
            this.Text18.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text18.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text18.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text19
            // 
            this.Text19 = new Stimulsoft.Report.Components.StiText();
            this.Text19.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(4.7, 1.4, 2.7, 0.2);
            this.Text19.Name = "Text19";
            this.Text19.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text19__GetValue);
            this.Text19.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text19.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text19.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text19.Guid = null;
            this.Text19.Interaction = null;
            this.Text19.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text19.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text19.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text20
            // 
            this.Text20 = new Stimulsoft.Report.Components.StiText();
            this.Text20.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(4.7, 1.6, 2.7, 0.2);
            this.Text20.Name = "Text20";
            this.Text20.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text20__GetValue);
            this.Text20.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text20.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text20.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text20.Guid = null;
            this.Text20.Interaction = null;
            this.Text20.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text20.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text20.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text21
            // 
            this.Text21 = new Stimulsoft.Report.Components.StiText();
            this.Text21.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 1.8, 0.6, 0.2);
            this.Text21.Guid = "f844c3c61c17416ab9ea7304314dffae";
            this.Text21.Name = "Text21";
            this.Text21.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text21__GetValue);
            this.Text21.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text21.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text21.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text21.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text21.Interaction = null;
            this.Text21.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text21.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text21.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text22
            // 
            this.Text22 = new Stimulsoft.Report.Components.StiText();
            this.Text22.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0.6, 1.8, 0.9, 0.2);
            this.Text22.Name = "Text22";
            this.Text22.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text22__GetValue);
            this.Text22.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text22.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text22.Font = new System.Drawing.Font("Courier New", 10F, System.Drawing.FontStyle.Bold);
            this.Text22.Guid = null;
            this.Text22.Interaction = null;
            this.Text22.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text22.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text22.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text23
            // 
            this.Text23 = new Stimulsoft.Report.Components.StiText();
            this.Text23.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(1.8, 1.8, 0.5, 0.2);
            this.Text23.Guid = "9c55e920f6d84be780a33a515e89404c";
            this.Text23.Name = "Text23";
            this.Text23.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text23__GetValue);
            this.Text23.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text23.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text23.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text23.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text23.Interaction = null;
            this.Text23.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text23.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text23.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text24
            // 
            this.Text24 = new Stimulsoft.Report.Components.StiText();
            this.Text24.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(2.3, 1.8, 1, 0.2);
            this.Text24.Name = "Text24";
            this.Text24.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text24__GetValue);
            this.Text24.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text24.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text24.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text24.Guid = null;
            this.Text24.Interaction = null;
            this.Text24.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text24.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text24.TextFormat = new Stimulsoft.Report.Components.TextFormats.StiDateFormatService("d", " ");
            this.Text24.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text25
            // 
            this.Text25 = new Stimulsoft.Report.Components.StiText();
            this.Text25.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(3.4, 1.8, 0.8, 0.2);
            this.Text25.Guid = "8c6a2b54b63345bf9303ae3ff296b7b6";
            this.Text25.Name = "Text25";
            this.Text25.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text25__GetValue);
            this.Text25.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text25.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text25.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text25.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text25.Interaction = null;
            this.Text25.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text25.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text25.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text26
            // 
            this.Text26 = new Stimulsoft.Report.Components.StiText();
            this.Text26.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(4.2, 1.8, 3.1, 0.2);
            this.Text26.Name = "Text26";
            this.Text26.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text26__GetValue);
            this.Text26.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text26.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text26.Font = new System.Drawing.Font("Courier New", 10F, System.Drawing.FontStyle.Bold);
            this.Text26.Guid = null;
            this.Text26.Interaction = null;
            this.Text26.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text26.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text26.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // HorizontalLine1
            // 
            this.HorizontalLine1 = new Stimulsoft.Report.Components.StiHorizontalLinePrimitive();
            this.HorizontalLine1.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 1.8, 7.5, 0.01);
            this.HorizontalLine1.Color = System.Drawing.Color.Black;
            this.HorizontalLine1.Name = "HorizontalLine1";
            this.HorizontalLine1.Style = Stimulsoft.Base.Drawing.StiPenStyle.Dash;
            this.HorizontalLine1.Guid = null;
            this.HorizontalLine1.Interaction = null;
            // 
            // HorizontalLine2
            // 
            this.HorizontalLine2 = new Stimulsoft.Report.Components.StiHorizontalLinePrimitive();
            this.HorizontalLine2.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 2, 7.5, 0.01);
            this.HorizontalLine2.Color = System.Drawing.Color.Black;
            this.HorizontalLine2.Name = "HorizontalLine2";
            this.HorizontalLine2.Style = Stimulsoft.Base.Drawing.StiPenStyle.Dash;
            this.HorizontalLine2.Guid = null;
            this.HorizontalLine2.Interaction = null;
            // 
            // StartPointPrimitive1
            // 
            this.StartPointPrimitive1 = new Stimulsoft.Report.Components.StiStartPointPrimitive();
            this.StartPointPrimitive1.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(3.4, 0.2, 0, 0);
            this.StartPointPrimitive1.Name = "StartPointPrimitive1";
            this.StartPointPrimitive1.ReferenceToGuid = "d341e55be8b149b59b51e91776f89712";
            this.StartPointPrimitive1.Guid = null;
            this.StartPointPrimitive1.Interaction = null;
            // 
            // EndPointPrimitive1
            // 
            this.EndPointPrimitive1 = new Stimulsoft.Report.Components.StiEndPointPrimitive();
            this.EndPointPrimitive1.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(3.41, 1.8, 0, 0);
            this.EndPointPrimitive1.Name = "EndPointPrimitive1";
            this.EndPointPrimitive1.ReferenceToGuid = "d341e55be8b149b59b51e91776f89712";
            this.EndPointPrimitive1.Guid = null;
            this.EndPointPrimitive1.Interaction = null;
            // 
            // HorizontalLine5
            // 
            this.HorizontalLine5 = new Stimulsoft.Report.Components.StiHorizontalLinePrimitive();
            this.HorizontalLine5.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 0.2, 7.5, 0.01);
            this.HorizontalLine5.Color = System.Drawing.Color.Black;
            this.HorizontalLine5.Name = "HorizontalLine5";
            this.HorizontalLine5.Style = Stimulsoft.Base.Drawing.StiPenStyle.Dash;
            this.HorizontalLine5.Guid = null;
            this.HorizontalLine5.Interaction = null;
            this.PageHeader1.Guid = null;
            this.PageHeader1.Interaction = null;
            // 
            // PageHeader2
            // 
            this.PageHeader2 = new Stimulsoft.Report.Components.StiPageHeaderBand();
            this.PageHeader2.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 2.6, 7.49, 0.2);
            this.PageHeader2.Name = "PageHeader2";
            this.PageHeader2.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.PageHeader2.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            // 
            // Text27
            // 
            this.Text27 = new Stimulsoft.Report.Components.StiText();
            this.Text27.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 0, 0.4, 0.2);
            this.Text27.Guid = "be2f6b1ca35c4ceeb613bfaecfd26c49";
            this.Text27.Name = "Text27";
            this.Text27.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text27__GetValue);
            this.Text27.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text27.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text27.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text27.Font = new System.Drawing.Font("Courier New", 10F, System.Drawing.FontStyle.Bold);
            this.Text27.Interaction = null;
            this.Text27.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text27.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text27.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text28
            // 
            this.Text28 = new Stimulsoft.Report.Components.StiText();
            this.Text28.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0.5, 0, 2.3, 0.2);
            this.Text28.Guid = "4313d2de0bd74a33ab52cbe9bdc794fa";
            this.Text28.Name = "Text28";
            this.Text28.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text28__GetValue);
            this.Text28.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text28.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text28.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text28.Font = new System.Drawing.Font("Courier New", 10F, System.Drawing.FontStyle.Bold);
            this.Text28.Interaction = null;
            this.Text28.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text28.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text28.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text29
            // 
            this.Text29 = new Stimulsoft.Report.Components.StiText();
            this.Text29.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(2.8, 0, 1.4, 0.2);
            this.Text29.Guid = "f5f3ff1c6dff490593a07db5fa41c514";
            this.Text29.Name = "Text29";
            this.Text29.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text29__GetValue);
            this.Text29.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text29.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text29.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text29.Font = new System.Drawing.Font("Courier New", 10F, System.Drawing.FontStyle.Bold);
            this.Text29.Interaction = null;
            this.Text29.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text29.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text29.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text30
            // 
            this.Text30 = new Stimulsoft.Report.Components.StiText();
            this.Text30.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(4.2, 0, 1.8, 0.2);
            this.Text30.Guid = "699da47e53e04713b2ab4b957c7a359a";
            this.Text30.Name = "Text30";
            this.Text30.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text30__GetValue);
            this.Text30.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text30.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text30.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text30.Font = new System.Drawing.Font("Courier New", 10F, System.Drawing.FontStyle.Bold);
            this.Text30.Interaction = null;
            this.Text30.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text30.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text30.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text31
            // 
            this.Text31 = new Stimulsoft.Report.Components.StiText();
            this.Text31.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(6, 0, 0.6, 0.2);
            this.Text31.Guid = "38d266dbcf3e4740adedb511d40b13ff";
            this.Text31.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Right;
            this.Text31.Name = "Text31";
            this.Text31.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text31__GetValue);
            this.Text31.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text31.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text31.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text31.Font = new System.Drawing.Font("Courier New", 10F, System.Drawing.FontStyle.Bold);
            this.Text31.Interaction = null;
            this.Text31.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text31.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text31.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text32
            // 
            this.Text32 = new Stimulsoft.Report.Components.StiText();
            this.Text32.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(6.6, 0, 0.8, 0.2);
            this.Text32.Guid = "28c154fc3354424d9a02c6e9fa132686";
            this.Text32.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Right;
            this.Text32.Name = "Text32";
            this.Text32.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text32__GetValue);
            this.Text32.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text32.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text32.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text32.Font = new System.Drawing.Font("Courier New", 10F, System.Drawing.FontStyle.Bold);
            this.Text32.Interaction = null;
            this.Text32.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text32.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text32.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // HorizontalLine3
            // 
            this.HorizontalLine3 = new Stimulsoft.Report.Components.StiHorizontalLinePrimitive();
            this.HorizontalLine3.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 0.2, 7.5, 0.01);
            this.HorizontalLine3.Color = System.Drawing.Color.Black;
            this.HorizontalLine3.Name = "HorizontalLine3";
            this.HorizontalLine3.Style = Stimulsoft.Base.Drawing.StiPenStyle.Dash;
            this.HorizontalLine3.Guid = null;
            this.HorizontalLine3.Interaction = null;
            this.PageHeader2.Guid = null;
            this.PageHeader2.Interaction = null;
            // 
            // PageFooter1
            // 
            this.PageFooter1 = new Stimulsoft.Report.Components.StiPageFooterBand();
            this.PageFooter1.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 4.9, 7.49, 0.9);
            this.PageFooter1.Name = "PageFooter1";
            this.PageFooter1.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.PageFooter1.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            // 
            // Text68
            // 
            this.Text68 = new Stimulsoft.Report.Components.StiText();
            this.Text68.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, -0.02, 0.8, 0.2);
            this.Text68.Guid = "1769588167ea4c8c927fc4cd9c80fa20";
            this.Text68.Name = "Text68";
            this.Text68.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text68__GetValue);
            this.Text68.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text68.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text68.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text68.Font = new System.Drawing.Font("Courier New", 10F, System.Drawing.FontStyle.Bold);
            this.Text68.Interaction = null;
            this.Text68.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text68.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text68.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text69
            // 
            this.Text69 = new Stimulsoft.Report.Components.StiText();
            this.Text69.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0.8, -0.02, 6.7, 0.2);
            this.Text69.Name = "Text69";
            this.Text69.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text69__GetValue);
            this.Text69.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text69.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text69.Font = new System.Drawing.Font("Palatino Linotype", 9F);
            this.Text69.Guid = null;
            this.Text69.Interaction = null;
            this.Text69.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text69.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text69.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text74
            // 
            this.Text74 = new Stimulsoft.Report.Components.StiText();
            this.Text74.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 0.68, 1.9, 0.2);
            this.Text74.Guid = "daa5647f03b34c3cbd90ddea6e54e783";
            this.Text74.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Center;
            this.Text74.Name = "Text74";
            this.Text74.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text74__GetValue);
            this.Text74.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text74.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text74.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text74.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text74.Interaction = null;
            this.Text74.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text74.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text74.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text75
            // 
            this.Text75 = new Stimulsoft.Report.Components.StiText();
            this.Text75.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(1.9, 0.68, 1.7, 0.2);
            this.Text75.Guid = "5ce43f898d424c30a669177f513e22d0";
            this.Text75.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Center;
            this.Text75.Name = "Text75";
            this.Text75.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text75__GetValue);
            this.Text75.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text75.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text75.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text75.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text75.Interaction = null;
            this.Text75.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text75.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text75.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text76
            // 
            this.Text76 = new Stimulsoft.Report.Components.StiText();
            this.Text76.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(3.6, 0.68, 1.7, 0.2);
            this.Text76.Guid = "5d5b46bda75f4035b092d8956b0c1cfc";
            this.Text76.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Center;
            this.Text76.Name = "Text76";
            this.Text76.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text76__GetValue);
            this.Text76.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text76.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text76.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text76.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text76.Interaction = null;
            this.Text76.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text76.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text76.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text77
            // 
            this.Text77 = new Stimulsoft.Report.Components.StiText();
            this.Text77.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(5.3, 0.68, 2.2, 0.2);
            this.Text77.Guid = "85719a8e52cf47eebcc1c6087a3dff4e";
            this.Text77.Name = "Text77";
            this.Text77.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text77__GetValue);
            this.Text77.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text77.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text77.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text77.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text77.Interaction = null;
            this.Text77.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text77.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text77.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text70
            // 
            this.Text70 = new Stimulsoft.Report.Components.StiText();
            this.Text70.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(5.2, 0.18, 2.3, 0.2);
            this.Text70.Name = "Text70";
            this.Text70.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text70__GetValue);
            this.Text70.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text70.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text70.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text70.Font = new System.Drawing.Font("Courier New", 10F, System.Drawing.FontStyle.Bold);
            this.Text70.Guid = null;
            this.Text70.Interaction = null;
            this.Text70.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text70.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text70.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // HorizontalLine13
            // 
            this.HorizontalLine13 = new Stimulsoft.Report.Components.StiHorizontalLinePrimitive();
            this.HorizontalLine13.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 0.18, 7.5, 0.01);
            this.HorizontalLine13.Color = System.Drawing.Color.Black;
            this.HorizontalLine13.Name = "HorizontalLine13";
            this.HorizontalLine13.Style = Stimulsoft.Base.Drawing.StiPenStyle.Dash;
            this.HorizontalLine13.Guid = null;
            this.HorizontalLine13.Interaction = null;
            // 
            // EndPointPrimitive2
            // 
            this.EndPointPrimitive2 = new Stimulsoft.Report.Components.StiEndPointPrimitive();
            this.EndPointPrimitive2.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(7.5, 0.9, 0, 0);
            this.EndPointPrimitive2.Name = "EndPointPrimitive2";
            this.EndPointPrimitive2.ReferenceToGuid = "80799902b8844cc2a7bb5da1354e75cc";
            this.EndPointPrimitive2.Guid = null;
            this.EndPointPrimitive2.Interaction = null;
            this.PageFooter1.Guid = null;
            this.PageFooter1.Interaction = null;
            // 
            // Data1
            // 
            this.Data1 = new Stimulsoft.Report.Components.StiDataBand();
            this.Data1.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 3.2, 7.49, 0.2);
            this.Data1.DataSourceName = "YarnDC";
            this.Data1.Name = "Data1";
            this.Data1.Sort = new System.String[0];
            this.Data1.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Data1.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            // 
            // Text33
            // 
            this.Text33 = new Stimulsoft.Report.Components.StiText();
            this.Text33.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 0, 0.4, 0.2);
            this.Text33.Name = "Text33";
            this.Text33.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text33__GetValue);
            this.Text33.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text33.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text33.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text33.Guid = null;
            this.Text33.Interaction = null;
            this.Text33.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text33.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text33.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text34
            // 
            this.Text34 = new Stimulsoft.Report.Components.StiText();
            this.Text34.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0.5, 0, 2.2, 0.2);
            this.Text34.Name = "Text34";
            this.Text34.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text34__GetValue);
            this.Text34.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text34.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text34.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text34.Guid = null;
            this.Text34.Interaction = null;
            this.Text34.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text34.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text34.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text35
            // 
            this.Text35 = new Stimulsoft.Report.Components.StiText();
            this.Text35.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(2.8, 0, 1.3, 0.2);
            this.Text35.Name = "Text35";
            this.Text35.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text35__GetValue);
            this.Text35.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text35.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text35.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text35.Guid = null;
            this.Text35.Interaction = null;
            this.Text35.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text35.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text35.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text36
            // 
            this.Text36 = new Stimulsoft.Report.Components.StiText();
            this.Text36.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(4.2, 0, 1.7, 0.2);
            this.Text36.Name = "Text36";
            this.Text36.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text36__GetValue);
            this.Text36.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text36.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text36.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text36.Guid = null;
            this.Text36.Interaction = null;
            this.Text36.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text36.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text36.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text37
            // 
            this.Text37 = new Stimulsoft.Report.Components.StiText();
            this.Text37.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(5.9, 0, 0.6, 0.2);
            this.Text37.HideZeros = true;
            this.Text37.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Right;
            this.Text37.Name = "Text37";
            this.Text37.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text37__GetValue);
            this.Text37.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text37.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text37.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text37.Guid = null;
            this.Text37.Interaction = null;
            this.Text37.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text37.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text37.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text38
            // 
            this.Text38 = new Stimulsoft.Report.Components.StiText();
            this.Text38.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(6.5, 0, 0.9, 0.2);
            this.Text38.HideZeros = true;
            this.Text38.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Right;
            this.Text38.Name = "Text38";
            this.Text38.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text38__GetValue);
            this.Text38.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text38.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text38.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text38.Guid = null;
            this.Text38.Interaction = null;
            this.Text38.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text38.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text38.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            this.Data1.DataRelationName = null;
            this.Data1.Guid = null;
            this.Data1.Interaction = null;
            this.Data1.MasterComponent = null;
            // 
            // Footer4
            // 
            this.Footer4 = new Stimulsoft.Report.Components.StiFooterBand();
            this.Footer4.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 3.8, 7.49, 0.2);
            this.Footer4.Name = "Footer4";
            this.Footer4.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Footer4.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            // 
            // Text64
            // 
            this.Text64 = new Stimulsoft.Report.Components.StiText();
            this.Text64.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(6.5, 0, 0.9, 0.2);
            this.Text64.HideZeros = true;
            this.Text64.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Right;
            this.Text64.Name = "Text64";
            // 
            // Text64_Sum
            // 
            this.Text64.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text64__GetValue);
            this.Text64.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text64.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text64.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text64.Font = new System.Drawing.Font("Courier New", 10F, System.Drawing.FontStyle.Bold);
            this.Text64.Guid = null;
            this.Text64.Interaction = null;
            this.Text64.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text64.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text64.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text67
            // 
            this.Text67 = new Stimulsoft.Report.Components.StiText();
            this.Text67.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(5.9, 0, 0.6, 0.2);
            this.Text67.HideZeros = true;
            this.Text67.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Right;
            this.Text67.Name = "Text67";
            // 
            // Text67_Sum
            // 
            this.Text67.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text67__GetValue);
            this.Text67.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text67.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text67.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text67.Font = new System.Drawing.Font("Courier New", 10F, System.Drawing.FontStyle.Bold);
            this.Text67.Guid = null;
            this.Text67.Interaction = null;
            this.Text67.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text67.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text67.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text66
            // 
            this.Text66 = new Stimulsoft.Report.Components.StiText();
            this.Text66.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(5.2, 0, 0.7, 0.2);
            this.Text66.Guid = "046f67ad814d4d47b986c3a7d96709a4";
            this.Text66.Name = "Text66";
            this.Text66.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text66__GetValue);
            this.Text66.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text66.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text66.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text66.Font = new System.Drawing.Font("Courier New", 10F, System.Drawing.FontStyle.Bold);
            this.Text66.Interaction = null;
            this.Text66.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text66.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text66.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // HorizontalLine11
            // 
            this.HorizontalLine11 = new Stimulsoft.Report.Components.StiHorizontalLinePrimitive();
            this.HorizontalLine11.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 0.2, 7.5, 0.01);
            this.HorizontalLine11.Color = System.Drawing.Color.Black;
            this.HorizontalLine11.Name = "HorizontalLine11";
            this.HorizontalLine11.Style = Stimulsoft.Base.Drawing.StiPenStyle.Dash;
            this.HorizontalLine11.Guid = null;
            this.HorizontalLine11.Interaction = null;
            this.Footer4.Guid = null;
            this.Footer4.Interaction = null;
            // 
            // Footer1
            // 
            this.Footer1 = new Stimulsoft.Report.Components.StiFooterBand();
            this.Footer1.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 4.4, 7.49, 0.2);
            this.Footer1.Name = "Footer1";
            this.Footer1.PrintIfEmpty = true;
            this.Footer1.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Footer1.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            // 
            // SubReportYarn
            // 
            this.SubReportYarn = new Stimulsoft.Report.Components.StiSubReport();
            this.SubReportYarn.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 0, 7.5, 0.1);
            this.SubReportYarn.Name = "SubReportYarn";
            this.SubReportYarn.SubReportPageGuid = "6bb3d0aca3c74490920d1507ca3871be";
            this.SubReportYarn.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.SubReportYarn.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.SubReportYarn.Guid = null;
            this.SubReportYarn.Interaction = null;
            // 
            // SubReportFabric
            // 
            this.SubReportFabric = new Stimulsoft.Report.Components.StiSubReport();
            this.SubReportFabric.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 0.1, 7.5, 0.1);
            this.SubReportFabric.Name = "SubReportFabric";
            this.SubReportFabric.SubReportPageGuid = "999d6459dbc24b43b074d62fa39c6317";
            this.SubReportFabric.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.SubReportFabric.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.SubReportFabric.Guid = null;
            this.SubReportFabric.Interaction = null;
            this.Footer1.Guid = null;
            this.Footer1.Interaction = null;
            // 
            // VerticalLine1
            // 
            this.VerticalLine1 = new Stimulsoft.Report.Components.StiVerticalLinePrimitive();
            this.VerticalLine1.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(3.4, 0.4, 0.01, 1.6);
            this.VerticalLine1.Color = System.Drawing.Color.Black;
            this.VerticalLine1.Guid = "d341e55be8b149b59b51e91776f89712";
            this.VerticalLine1.Name = "VerticalLine1";
            this.VerticalLine1.Style = Stimulsoft.Base.Drawing.StiPenStyle.Dash;
            this.VerticalLine1.Interaction = null;
            // 
            // Rectangle1
            // 
            this.Rectangle1 = new Stimulsoft.Report.Components.StiRectanglePrimitive();
            this.Rectangle1.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 0, 7.5, 5.8);
            this.Rectangle1.Color = System.Drawing.Color.Black;
            this.Rectangle1.Guid = "80799902b8844cc2a7bb5da1354e75cc";
            this.Rectangle1.Name = "Rectangle1";
            this.Rectangle1.Style = Stimulsoft.Base.Drawing.StiPenStyle.Dash;
            this.Rectangle1.Interaction = null;
            // 
            // StartPointPrimitive2
            // 
            this.StartPointPrimitive2 = new Stimulsoft.Report.Components.StiStartPointPrimitive();
            this.InitializeComponent2();
        }
        
        public void InitializeComponent2()
        {
            this.StartPointPrimitive2.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 0, 0, 0);
            this.StartPointPrimitive2.Name = "StartPointPrimitive2";
            this.StartPointPrimitive2.ReferenceToGuid = "80799902b8844cc2a7bb5da1354e75cc";
            this.StartPointPrimitive2.Guid = null;
            this.StartPointPrimitive2.Interaction = null;
            this.Page1.ExcelSheetValue = null;
            this.Page1.Interaction = null;
            this.Page1.Margins = new Stimulsoft.Report.Components.StiMargins(0.39, 0.39, 0.25, 0.25);
            this.Page1_Watermark = new Stimulsoft.Report.Components.StiWatermark();
            this.Page1_Watermark.Font = new System.Drawing.Font("Arial", 100F);
            this.Page1_Watermark.Image = null;
            this.Page1_Watermark.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.FromArgb(50, 0, 0, 0));
            // 
            // Sub_Report_2
            // 
            this.Sub_Report_2 = new Stimulsoft.Report.Components.StiPage();
            this.Sub_Report_2.Guid = "6bb3d0aca3c74490920d1507ca3871be";
            this.Sub_Report_2.Name = "Sub_Report_2";
            this.Sub_Report_2.PageHeight = 11.69;
            this.Sub_Report_2.PageWidth = 8.28;
            this.Sub_Report_2.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 2, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Sub_Report_2.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            // 
            // Header1
            // 
            this.Header1 = new Stimulsoft.Report.Components.StiHeaderBand();
            this.Header1.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 0.2, 7.5, 0.4);
            this.Header1.Name = "Header1";
            this.Header1.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Header1.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            // 
            // Text39
            // 
            this.Text39 = new Stimulsoft.Report.Components.StiText();
            this.Text39.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 0, 1.4, 0.2);
            this.Text39.Name = "Text39";
            this.Text39.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text39__GetValue);
            this.Text39.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text39.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text39.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text39.Font = new System.Drawing.Font("Courier New", 11F, System.Drawing.FontStyle.Bold);
            this.Text39.Guid = null;
            this.Text39.Interaction = null;
            this.Text39.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text39.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text39.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text40
            // 
            this.Text40 = new Stimulsoft.Report.Components.StiText();
            this.Text40.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 0.2, 2.2, 0.2);
            this.Text40.Guid = "369695cf612149379d8a3022f0e070c7";
            this.Text40.Name = "Text40";
            this.Text40.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text40__GetValue);
            this.Text40.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text40.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text40.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text40.Font = new System.Drawing.Font("Courier New", 10F, System.Drawing.FontStyle.Bold);
            this.Text40.Interaction = null;
            this.Text40.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text40.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text40.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text41
            // 
            this.Text41 = new Stimulsoft.Report.Components.StiText();
            this.Text41.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(2.3, 0.2, 2.1, 0.2);
            this.Text41.Guid = "300d782ecfb64f908f9c06a35e779975";
            this.Text41.Name = "Text41";
            this.Text41.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text41__GetValue);
            this.Text41.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text41.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text41.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text41.Font = new System.Drawing.Font("Courier New", 10F, System.Drawing.FontStyle.Bold);
            this.Text41.Interaction = null;
            this.Text41.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text41.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text41.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text42
            // 
            this.Text42 = new Stimulsoft.Report.Components.StiText();
            this.Text42.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(4.6, 0.2, 1, 0.2);
            this.Text42.Guid = "bf9d383118b949c09830e0ac97a13629";
            this.Text42.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Right;
            this.Text42.Name = "Text42";
            this.Text42.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text42__GetValue);
            this.Text42.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text42.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text42.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text42.Font = new System.Drawing.Font("Courier New", 10F, System.Drawing.FontStyle.Bold);
            this.Text42.Interaction = null;
            this.Text42.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text42.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text42.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // HorizontalLine4
            // 
            this.HorizontalLine4 = new Stimulsoft.Report.Components.StiHorizontalLinePrimitive();
            this.HorizontalLine4.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 0.4, 7.5, 0.01);
            this.HorizontalLine4.Color = System.Drawing.Color.Black;
            this.HorizontalLine4.Name = "HorizontalLine4";
            this.HorizontalLine4.Style = Stimulsoft.Base.Drawing.StiPenStyle.Dash;
            this.HorizontalLine4.Guid = null;
            this.HorizontalLine4.Interaction = null;
            // 
            // HorizontalLine6
            // 
            this.HorizontalLine6 = new Stimulsoft.Report.Components.StiHorizontalLinePrimitive();
            this.HorizontalLine6.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 0.2, 7.5, 0.01);
            this.HorizontalLine6.Color = System.Drawing.Color.Black;
            this.HorizontalLine6.Name = "HorizontalLine6";
            this.HorizontalLine6.Style = Stimulsoft.Base.Drawing.StiPenStyle.Dash;
            this.HorizontalLine6.Guid = null;
            this.HorizontalLine6.Interaction = null;
            this.Header1.Guid = null;
            this.Header1.Interaction = null;
            // 
            // Data2
            // 
            this.Data2 = new Stimulsoft.Report.Components.StiDataBand();
            this.Data2.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 1, 7.5, 0.2);
            this.Data2.DataSourceName = "YarnSubReport";
            this.Data2.Name = "Data2";
            this.Data2.Sort = new System.String[0];
            this.Data2.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Data2.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            // 
            // Text43
            // 
            this.Text43 = new Stimulsoft.Report.Components.StiText();
            this.Text43.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 0, 2.2, 0.2);
            this.Text43.Name = "Text43";
            this.Text43.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text43__GetValue);
            this.Text43.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text43.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text43.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text43.Guid = null;
            this.Text43.Interaction = null;
            this.Text43.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text43.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text43.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text44
            // 
            this.Text44 = new Stimulsoft.Report.Components.StiText();
            this.Text44.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(2.3, 0, 2.1, 0.2);
            this.Text44.Name = "Text44";
            this.Text44.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text44__GetValue);
            this.Text44.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text44.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text44.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text44.Guid = null;
            this.Text44.Interaction = null;
            this.Text44.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text44.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text44.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text45
            // 
            this.Text45 = new Stimulsoft.Report.Components.StiText();
            this.Text45.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(4.5, 0, 1.2, 0.2);
            this.Text45.HideZeros = true;
            this.Text45.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Right;
            this.Text45.Name = "Text45";
            this.Text45.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text45__GetValue);
            this.Text45.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text45.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text45.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text45.Guid = null;
            this.Text45.Interaction = null;
            this.Text45.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text45.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text45.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            this.Data2.DataRelationName = null;
            this.Data2.Guid = null;
            this.Data2.Interaction = null;
            this.Data2.MasterComponent = null;
            // 
            // Footer2
            // 
            this.Footer2 = new Stimulsoft.Report.Components.StiFooterBand();
            this.Footer2.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 1.6, 7.5, 0.2);
            this.Footer2.Name = "Footer2";
            this.Footer2.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Footer2.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            // 
            // Text46
            // 
            this.Text46 = new Stimulsoft.Report.Components.StiText();
            this.Text46.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(4.5, 0, 1.2, 0.2);
            this.Text46.HideZeros = true;
            this.Text46.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Right;
            this.Text46.Name = "Text46";
            // 
            // Text46_Sum
            // 
            this.Text46.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text46__GetValue);
            this.Text46.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text46.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text46.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text46.Font = new System.Drawing.Font("Courier New", 10F, System.Drawing.FontStyle.Bold);
            this.Text46.Guid = null;
            this.Text46.Interaction = null;
            this.Text46.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text46.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text46.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // HorizontalLine7
            // 
            this.HorizontalLine7 = new Stimulsoft.Report.Components.StiHorizontalLinePrimitive();
            this.HorizontalLine7.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 0.2, 7.5, 0.01);
            this.HorizontalLine7.Color = System.Drawing.Color.Black;
            this.HorizontalLine7.Name = "HorizontalLine7";
            this.HorizontalLine7.Style = Stimulsoft.Base.Drawing.StiPenStyle.Dash;
            this.HorizontalLine7.Guid = null;
            this.HorizontalLine7.Interaction = null;
            this.Footer2.Guid = null;
            this.Footer2.Interaction = null;
            this.Sub_Report_2.ExcelSheetValue = null;
            this.Sub_Report_2.Interaction = null;
            this.Sub_Report_2.Margins = new Stimulsoft.Report.Components.StiMargins(0.39, 0.39, 0.39, 0.39);
            this.Sub_Report_2_Watermark = new Stimulsoft.Report.Components.StiWatermark();
            this.Sub_Report_2_Watermark.Font = new System.Drawing.Font("Arial", 100F);
            this.Sub_Report_2_Watermark.Image = null;
            this.Sub_Report_2_Watermark.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.FromArgb(50, 0, 0, 0));
            // 
            // Sub_Report_1
            // 
            this.Sub_Report_1 = new Stimulsoft.Report.Components.StiPage();
            this.Sub_Report_1.Guid = "999d6459dbc24b43b074d62fa39c6317";
            this.Sub_Report_1.Name = "Sub_Report_1";
            this.Sub_Report_1.PageHeight = 11.69;
            this.Sub_Report_1.PageWidth = 8.28;
            this.Sub_Report_1.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 2, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Sub_Report_1.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            // 
            // Header2
            // 
            this.Header2 = new Stimulsoft.Report.Components.StiHeaderBand();
            this.Header2.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 0.2, 7.5, 0.4);
            this.Header2.Name = "Header2";
            this.Header2.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Header2.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            // 
            // Text47
            // 
            this.Text47 = new Stimulsoft.Report.Components.StiText();
            this.Text47.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 0, 1.4, 0.2);
            this.Text47.Guid = "20631bc722644ea6b0a170a7fefafb14";
            this.Text47.Name = "Text47";
            this.Text47.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text47__GetValue);
            this.Text47.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text47.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text47.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text47.Font = new System.Drawing.Font("Courier New", 11F, System.Drawing.FontStyle.Bold);
            this.Text47.Interaction = null;
            this.Text47.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text47.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text47.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text48
            // 
            this.Text48 = new Stimulsoft.Report.Components.StiText();
            this.Text48.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 0.2, 3, 0.2);
            this.Text48.Guid = "38624610add64dd885d5acc695f460f2";
            this.Text48.Name = "Text48";
            this.Text48.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text48__GetValue);
            this.Text48.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text48.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text48.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text48.Font = new System.Drawing.Font("Courier New", 10F, System.Drawing.FontStyle.Bold);
            this.Text48.Interaction = null;
            this.Text48.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text48.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text48.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text49
            // 
            this.Text49 = new Stimulsoft.Report.Components.StiText();
            this.Text49.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(3, 0.2, 0.4, 0.2);
            this.Text49.Guid = "bc120c25b70b4c8b8aef9fafe550da6f";
            this.Text49.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Center;
            this.Text49.Name = "Text49";
            this.Text49.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text49__GetValue);
            this.Text49.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text49.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text49.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text49.Font = new System.Drawing.Font("Courier New", 10F, System.Drawing.FontStyle.Bold);
            this.Text49.Interaction = null;
            this.Text49.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text49.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text49.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text50
            // 
            this.Text50 = new Stimulsoft.Report.Components.StiText();
            this.Text50.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(3.4, 0.2, 0.3, 0.2);
            this.Text50.Guid = "ee93303568e6487abd4734245d9f5601";
            this.Text50.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Center;
            this.Text50.Name = "Text50";
            this.Text50.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text50__GetValue);
            this.Text50.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text50.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text50.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text50.Font = new System.Drawing.Font("Courier New", 10F, System.Drawing.FontStyle.Bold);
            this.Text50.Interaction = null;
            this.Text50.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text50.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text50.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text51
            // 
            this.Text51 = new Stimulsoft.Report.Components.StiText();
            this.Text51.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(3.8, 0.2, 0.6, 0.2);
            this.Text51.Guid = "1fb1e69b04154bbc8223cfbe1bcc1a63";
            this.Text51.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Center;
            this.Text51.Name = "Text51";
            this.Text51.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text51__GetValue);
            this.Text51.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text51.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text51.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text51.Font = new System.Drawing.Font("Courier New", 10F, System.Drawing.FontStyle.Bold);
            this.Text51.Interaction = null;
            this.Text51.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text51.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text51.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text52
            // 
            this.Text52 = new Stimulsoft.Report.Components.StiText();
            this.Text52.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(4.5, 0.2, 0.7, 0.2);
            this.Text52.Guid = "ceececa96e4849d28795178e0adab37c";
            this.Text52.Name = "Text52";
            this.Text52.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text52__GetValue);
            this.Text52.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text52.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text52.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text52.Font = new System.Drawing.Font("Courier New", 10F, System.Drawing.FontStyle.Bold);
            this.Text52.Interaction = null;
            this.Text52.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text52.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text52.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text53
            // 
            this.Text53 = new Stimulsoft.Report.Components.StiText();
            this.Text53.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(5.3, 0.2, 0.9, 0.2);
            this.Text53.Guid = "65649a2fe1814465a6d7c34aab784063";
            this.Text53.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Right;
            this.Text53.Name = "Text53";
            this.Text53.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text53__GetValue);
            this.Text53.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text53.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text53.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text53.Font = new System.Drawing.Font("Courier New", 10F, System.Drawing.FontStyle.Bold);
            this.Text53.Interaction = null;
            this.Text53.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text53.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text53.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text54
            // 
            this.Text54 = new Stimulsoft.Report.Components.StiText();
            this.Text54.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(6.3, 0.2, 1.1, 0.2);
            this.Text54.Guid = "999938c7a5d04c309baf618c02940558";
            this.Text54.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Center;
            this.Text54.Name = "Text54";
            this.Text54.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text54__GetValue);
            this.Text54.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text54.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text54.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text54.Font = new System.Drawing.Font("Courier New", 10F, System.Drawing.FontStyle.Bold);
            this.Text54.Interaction = null;
            this.Text54.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text54.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text54.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // HorizontalLine8
            // 
            this.HorizontalLine8 = new Stimulsoft.Report.Components.StiHorizontalLinePrimitive();
            this.HorizontalLine8.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 0.2, 7.5, 0.01);
            this.HorizontalLine8.Color = System.Drawing.Color.Black;
            this.HorizontalLine8.Name = "HorizontalLine8";
            this.HorizontalLine8.Style = Stimulsoft.Base.Drawing.StiPenStyle.Dash;
            this.HorizontalLine8.Guid = null;
            this.HorizontalLine8.Interaction = null;
            // 
            // HorizontalLine9
            // 
            this.HorizontalLine9 = new Stimulsoft.Report.Components.StiHorizontalLinePrimitive();
            this.HorizontalLine9.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 0.4, 7.5, 0.01);
            this.HorizontalLine9.Color = System.Drawing.Color.Black;
            this.HorizontalLine9.Name = "HorizontalLine9";
            this.HorizontalLine9.Style = Stimulsoft.Base.Drawing.StiPenStyle.Dash;
            this.HorizontalLine9.Guid = null;
            this.HorizontalLine9.Interaction = null;
            this.Header2.Guid = null;
            this.Header2.Interaction = null;
            // 
            // Data3
            // 
            this.Data3 = new Stimulsoft.Report.Components.StiDataBand();
            this.Data3.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 1, 7.5, 0.2);
            this.Data3.DataSourceName = "FabricsubReport";
            this.Data3.Name = "Data3";
            this.Data3.Sort = new System.String[0];
            this.Data3.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Data3.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            // 
            // Text55
            // 
            this.Text55 = new Stimulsoft.Report.Components.StiText();
            this.Text55.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 0, 2.9, 0.2);
            this.Text55.Name = "Text55";
            this.Text55.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text55__GetValue);
            this.Text55.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text55.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text55.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text55.Guid = null;
            this.Text55.Interaction = null;
            this.Text55.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text55.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text55.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text56
            // 
            this.Text56 = new Stimulsoft.Report.Components.StiText();
            this.Text56.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(3, 0, 0.4, 0.2);
            this.Text56.Name = "Text56";
            this.Text56.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text56__GetValue);
            this.Text56.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text56.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text56.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text56.Guid = null;
            this.Text56.Interaction = null;
            this.Text56.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text56.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text56.TextFormat = new Stimulsoft.Report.Components.TextFormats.StiNumberFormatService(1, ".", 0, ",", 3, true, false, " ");
            this.Text56.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text57
            // 
            this.Text57 = new Stimulsoft.Report.Components.StiText();
            this.Text57.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(3.4, 0, 0.3, 0.2);
            this.Text57.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Center;
            this.Text57.Name = "Text57";
            this.Text57.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text57__GetValue);
            this.Text57.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text57.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text57.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text57.Guid = null;
            this.Text57.Interaction = null;
            this.Text57.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text57.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text57.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text58
            // 
            this.Text58 = new Stimulsoft.Report.Components.StiText();
            this.Text58.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(3.8, 0, 0.6, 0.2);
            this.Text58.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Center;
            this.Text58.Name = "Text58";
            this.Text58.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text58__GetValue);
            this.Text58.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text58.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text58.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text58.Guid = null;
            this.Text58.Interaction = null;
            this.Text58.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text58.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text58.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text59
            // 
            this.Text59 = new Stimulsoft.Report.Components.StiText();
            this.Text59.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(4.5, 0, 0.6, 0.2);
            this.Text59.Name = "Text59";
            this.Text59.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text59__GetValue);
            this.Text59.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text59.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text59.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text59.Guid = null;
            this.Text59.Interaction = null;
            this.Text59.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text59.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text59.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text60
            // 
            this.Text60 = new Stimulsoft.Report.Components.StiText();
            this.Text60.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(5.2, 0, 1, 0.2);
            this.Text60.HideZeros = true;
            this.Text60.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Right;
            this.Text60.Name = "Text60";
            this.Text60.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text60__GetValue);
            this.Text60.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text60.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text60.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text60.Guid = null;
            this.Text60.Interaction = null;
            this.Text60.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text60.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text60.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text61
            // 
            this.Text61 = new Stimulsoft.Report.Components.StiText();
            this.Text61.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(6.3, 0, 0.7, 0.2);
            this.Text61.HideZeros = true;
            this.Text61.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Right;
            this.Text61.Name = "Text61";
            this.Text61.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text61__GetValue);
            this.Text61.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text61.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text61.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text61.Guid = null;
            this.Text61.Interaction = null;
            this.Text61.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text61.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text61.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text62
            // 
            this.Text62 = new Stimulsoft.Report.Components.StiText();
            this.Text62.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(7, 0, 0.4, 0.2);
            this.Text62.Name = "Text62";
            this.Text62.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text62__GetValue);
            this.Text62.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text62.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text62.Font = new System.Drawing.Font("Courier New", 10F);
            this.Text62.Guid = null;
            this.Text62.Interaction = null;
            this.Text62.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text62.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text62.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            this.Data3.DataRelationName = null;
            this.Data3.Guid = null;
            this.Data3.Interaction = null;
            this.Data3.MasterComponent = null;
            // 
            // Footer3
            // 
            this.Footer3 = new Stimulsoft.Report.Components.StiFooterBand();
            this.Footer3.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 1.6, 7.5, 0.2);
            this.Footer3.Name = "Footer3";
            this.Footer3.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Footer3.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            // 
            // Text63
            // 
            this.Text63 = new Stimulsoft.Report.Components.StiText();
            this.Text63.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(5.3, 0, 0.9, 0.2);
            this.Text63.HideZeros = true;
            this.Text63.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Right;
            this.Text63.Name = "Text63";
            // 
            // Text63_Sum
            // 
            this.Text63.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text63__GetValue);
            this.Text63.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text63.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text63.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text63.Font = new System.Drawing.Font("Courier New", 10F, System.Drawing.FontStyle.Bold);
            this.Text63.Guid = null;
            this.Text63.Interaction = null;
            this.Text63.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text63.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text63.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text65
            // 
            this.Text65 = new Stimulsoft.Report.Components.StiText();
            this.Text65.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(6.2, 0, 0.8, 0.2);
            this.Text65.HideZeros = true;
            this.Text65.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Right;
            this.Text65.Name = "Text65";
            // 
            // Text65_Sum
            // 
            this.Text65.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text65__GetValue);
            this.Text65.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text65.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text65.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text65.Font = new System.Drawing.Font("Courier New", 10F, System.Drawing.FontStyle.Bold);
            this.Text65.Guid = null;
            this.Text65.Interaction = null;
            this.Text65.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text65.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text65.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // HorizontalLine10
            // 
            this.HorizontalLine10 = new Stimulsoft.Report.Components.StiHorizontalLinePrimitive();
            this.HorizontalLine10.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 0.2, 7.5, 0.01);
            this.HorizontalLine10.Color = System.Drawing.Color.Black;
            this.HorizontalLine10.Name = "HorizontalLine10";
            this.HorizontalLine10.Style = Stimulsoft.Base.Drawing.StiPenStyle.Dash;
            this.HorizontalLine10.Guid = null;
            this.HorizontalLine10.Interaction = null;
            this.Footer3.Guid = null;
            this.Footer3.Interaction = null;
            this.Sub_Report_1.ExcelSheetValue = null;
            this.Sub_Report_1.Interaction = null;
            this.Sub_Report_1.Margins = new Stimulsoft.Report.Components.StiMargins(0.39, 0.39, 0.39, 0.39);
            this.Sub_Report_1_Watermark = new Stimulsoft.Report.Components.StiWatermark();
            this.Sub_Report_1_Watermark.Font = new System.Drawing.Font("Arial", 100F);
            this.Sub_Report_1_Watermark.Image = null;
            this.Sub_Report_1_Watermark.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.FromArgb(50, 0, 0, 0));
            this.Report_PrinterSettings = new Stimulsoft.Report.Print.StiPrinterSettings();
            this.PrinterSettings = this.Report_PrinterSettings;
            this.Page1.Page = this.Page1;
            this.Page1.Report = this;
            this.Page1.Watermark = this.Page1_Watermark;
            this.PageHeader1.Page = this.Page1;
            this.PageHeader1.Parent = this.Page1;
            this.Text1.Page = this.Page1;
            this.Text1.Parent = this.PageHeader1;
            this.Text2.Page = this.Page1;
            this.Text2.Parent = this.PageHeader1;
            this.Text3.Page = this.Page1;
            this.Text3.Parent = this.PageHeader1;
            this.Text4.Page = this.Page1;
            this.Text4.Parent = this.PageHeader1;
            this.Text5.Page = this.Page1;
            this.Text5.Parent = this.PageHeader1;
            this.Text6.Page = this.Page1;
            this.Text6.Parent = this.PageHeader1;
            this.Text7.Page = this.Page1;
            this.Text7.Parent = this.PageHeader1;
            this.Text8.Page = this.Page1;
            this.Text8.Parent = this.PageHeader1;
            this.Text9.Page = this.Page1;
            this.Text9.Parent = this.PageHeader1;
            this.Text10.Page = this.Page1;
            this.Text10.Parent = this.PageHeader1;
            this.Text11.Page = this.Page1;
            this.Text11.Parent = this.PageHeader1;
            this.Text12.Page = this.Page1;
            this.Text12.Parent = this.PageHeader1;
            this.Text13.Page = this.Page1;
            this.Text13.Parent = this.PageHeader1;
            this.Text14.Page = this.Page1;
            this.Text14.Parent = this.PageHeader1;
            this.Text15.Page = this.Page1;
            this.Text15.Parent = this.PageHeader1;
            this.Text16.Page = this.Page1;
            this.Text16.Parent = this.PageHeader1;
            this.Text17.Page = this.Page1;
            this.Text17.Parent = this.PageHeader1;
            this.Text18.Page = this.Page1;
            this.Text18.Parent = this.PageHeader1;
            this.Text19.Page = this.Page1;
            this.Text19.Parent = this.PageHeader1;
            this.Text20.Page = this.Page1;
            this.Text20.Parent = this.PageHeader1;
            this.Text21.Page = this.Page1;
            this.Text21.Parent = this.PageHeader1;
            this.Text22.Page = this.Page1;
            this.Text22.Parent = this.PageHeader1;
            this.Text23.Page = this.Page1;
            this.Text23.Parent = this.PageHeader1;
            this.Text24.Page = this.Page1;
            this.Text24.Parent = this.PageHeader1;
            this.Text25.Page = this.Page1;
            this.Text25.Parent = this.PageHeader1;
            this.Text26.Page = this.Page1;
            this.Text26.Parent = this.PageHeader1;
            this.HorizontalLine1.Page = this.Page1;
            this.HorizontalLine1.Parent = this.PageHeader1;
            this.HorizontalLine2.Page = this.Page1;
            this.HorizontalLine2.Parent = this.PageHeader1;
            this.StartPointPrimitive1.Page = this.Page1;
            this.StartPointPrimitive1.Parent = this.PageHeader1;
            this.EndPointPrimitive1.Page = this.Page1;
            this.EndPointPrimitive1.Parent = this.PageHeader1;
            this.HorizontalLine5.Page = this.Page1;
            this.HorizontalLine5.Parent = this.PageHeader1;
            this.PageHeader2.Page = this.Page1;
            this.PageHeader2.Parent = this.Page1;
            this.Text27.Page = this.Page1;
            this.Text27.Parent = this.PageHeader2;
            this.Text28.Page = this.Page1;
            this.Text28.Parent = this.PageHeader2;
            this.Text29.Page = this.Page1;
            this.Text29.Parent = this.PageHeader2;
            this.Text30.Page = this.Page1;
            this.Text30.Parent = this.PageHeader2;
            this.Text31.Page = this.Page1;
            this.Text31.Parent = this.PageHeader2;
            this.Text32.Page = this.Page1;
            this.Text32.Parent = this.PageHeader2;
            this.HorizontalLine3.Page = this.Page1;
            this.HorizontalLine3.Parent = this.PageHeader2;
            this.PageFooter1.Page = this.Page1;
            this.PageFooter1.Parent = this.Page1;
            this.Text68.Page = this.Page1;
            this.Text68.Parent = this.PageFooter1;
            this.Text69.Page = this.Page1;
            this.Text69.Parent = this.PageFooter1;
            this.Text74.Page = this.Page1;
            this.Text74.Parent = this.PageFooter1;
            this.Text75.Page = this.Page1;
            this.Text75.Parent = this.PageFooter1;
            this.Text76.Page = this.Page1;
            this.Text76.Parent = this.PageFooter1;
            this.Text77.Page = this.Page1;
            this.Text77.Parent = this.PageFooter1;
            this.Text70.Page = this.Page1;
            this.Text70.Parent = this.PageFooter1;
            this.HorizontalLine13.Page = this.Page1;
            this.HorizontalLine13.Parent = this.PageFooter1;
            this.EndPointPrimitive2.Page = this.Page1;
            this.EndPointPrimitive2.Parent = this.PageFooter1;
            this.Data1.Page = this.Page1;
            this.Data1.Parent = this.Page1;
            this.Text33.Page = this.Page1;
            this.Text33.Parent = this.Data1;
            this.Text34.Page = this.Page1;
            this.Text34.Parent = this.Data1;
            this.Text35.Page = this.Page1;
            this.Text35.Parent = this.Data1;
            this.Text36.Page = this.Page1;
            this.Text36.Parent = this.Data1;
            this.Text37.Page = this.Page1;
            this.Text37.Parent = this.Data1;
            this.Text38.Page = this.Page1;
            this.Text38.Parent = this.Data1;
            this.Footer4.Page = this.Page1;
            this.Footer4.Parent = this.Page1;
            this.Text64.Page = this.Page1;
            this.Text64.Parent = this.Footer4;
            this.Text67.Page = this.Page1;
            this.Text67.Parent = this.Footer4;
            this.Text66.Page = this.Page1;
            this.Text66.Parent = this.Footer4;
            this.HorizontalLine11.Page = this.Page1;
            this.HorizontalLine11.Parent = this.Footer4;
            this.Footer1.Page = this.Page1;
            this.Footer1.Parent = this.Page1;
            this.SubReportYarn.Page = this.Page1;
            this.SubReportYarn.Parent = this.Footer1;
            this.SubReportFabric.Page = this.Page1;
            this.SubReportFabric.Parent = this.Footer1;
            this.VerticalLine1.Page = this.Page1;
            this.VerticalLine1.Parent = this.Page1;
            this.Rectangle1.Page = this.Page1;
            this.Rectangle1.Parent = this.Page1;
            this.StartPointPrimitive2.Page = this.Page1;
            this.StartPointPrimitive2.Parent = this.Page1;
            this.Sub_Report_2.Page = this.Sub_Report_2;
            this.Sub_Report_2.Report = this;
            this.Sub_Report_2.Watermark = this.Sub_Report_2_Watermark;
            this.Header1.Page = this.Sub_Report_2;
            this.Header1.Parent = this.Sub_Report_2;
            this.Text39.Page = this.Sub_Report_2;
            this.Text39.Parent = this.Header1;
            this.Text40.Page = this.Sub_Report_2;
            this.Text40.Parent = this.Header1;
            this.Text41.Page = this.Sub_Report_2;
            this.Text41.Parent = this.Header1;
            this.Text42.Page = this.Sub_Report_2;
            this.Text42.Parent = this.Header1;
            this.HorizontalLine4.Page = this.Sub_Report_2;
            this.HorizontalLine4.Parent = this.Header1;
            this.HorizontalLine6.Page = this.Sub_Report_2;
            this.HorizontalLine6.Parent = this.Header1;
            this.Data2.Page = this.Sub_Report_2;
            this.Data2.Parent = this.Sub_Report_2;
            this.Text43.Page = this.Sub_Report_2;
            this.Text43.Parent = this.Data2;
            this.Text44.Page = this.Sub_Report_2;
            this.Text44.Parent = this.Data2;
            this.Text45.Page = this.Sub_Report_2;
            this.Text45.Parent = this.Data2;
            this.Footer2.Page = this.Sub_Report_2;
            this.Footer2.Parent = this.Sub_Report_2;
            this.Text46.Page = this.Sub_Report_2;
            this.Text46.Parent = this.Footer2;
            this.HorizontalLine7.Page = this.Sub_Report_2;
            this.HorizontalLine7.Parent = this.Footer2;
            this.Sub_Report_1.Page = this.Sub_Report_1;
            this.Sub_Report_1.Report = this;
            this.Sub_Report_1.Watermark = this.Sub_Report_1_Watermark;
            this.Header2.Page = this.Sub_Report_1;
            this.Header2.Parent = this.Sub_Report_1;
            this.Text47.Page = this.Sub_Report_1;
            this.Text47.Parent = this.Header2;
            this.Text48.Page = this.Sub_Report_1;
            this.Text48.Parent = this.Header2;
            this.Text49.Page = this.Sub_Report_1;
            this.Text49.Parent = this.Header2;
            this.Text50.Page = this.Sub_Report_1;
            this.Text50.Parent = this.Header2;
            this.Text51.Page = this.Sub_Report_1;
            this.Text51.Parent = this.Header2;
            this.Text52.Page = this.Sub_Report_1;
            this.Text52.Parent = this.Header2;
            this.Text53.Page = this.Sub_Report_1;
            this.Text53.Parent = this.Header2;
            this.Text54.Page = this.Sub_Report_1;
            this.Text54.Parent = this.Header2;
            this.HorizontalLine8.Page = this.Sub_Report_1;
            this.HorizontalLine8.Parent = this.Header2;
            this.HorizontalLine9.Page = this.Sub_Report_1;
            this.HorizontalLine9.Parent = this.Header2;
            this.Data3.Page = this.Sub_Report_1;
            this.Data3.Parent = this.Sub_Report_1;
            this.Text55.Page = this.Sub_Report_1;
            this.Text55.Parent = this.Data3;
            this.Text56.Page = this.Sub_Report_1;
            this.Text56.Parent = this.Data3;
            this.Text57.Page = this.Sub_Report_1;
            this.Text57.Parent = this.Data3;
            this.Text58.Page = this.Sub_Report_1;
            this.Text58.Parent = this.Data3;
            this.Text59.Page = this.Sub_Report_1;
            this.Text59.Parent = this.Data3;
            this.Text60.Page = this.Sub_Report_1;
            this.Text60.Parent = this.Data3;
            this.Text61.Page = this.Sub_Report_1;
            this.Text61.Parent = this.Data3;
            this.Text62.Page = this.Sub_Report_1;
            this.Text62.Parent = this.Data3;
            this.Footer3.Page = this.Sub_Report_1;
            this.Footer3.Parent = this.Sub_Report_1;
            this.Text63.Page = this.Sub_Report_1;
            this.Text63.Parent = this.Footer3;
            this.Text65.Page = this.Sub_Report_1;
            this.Text65.Parent = this.Footer3;
            this.HorizontalLine10.Page = this.Sub_Report_1;
            this.HorizontalLine10.Parent = this.Footer3;
            this.Data1.BeginRender += new System.EventHandler(this.Data1__BeginRender);
            this.Data1.EndRender += new System.EventHandler(this.Data1__EndRender);
            this.Data2.BeginRender += new System.EventHandler(this.Data2__BeginRender);
            this.Data2.EndRender += new System.EventHandler(this.Data2__EndRender);
            this.Data3.BeginRender += new System.EventHandler(this.Data3__BeginRender);
            this.Data3.EndRender += new System.EventHandler(this.Data3__EndRender);
            this.Data1.Rendering += new System.EventHandler(this.Data1__Rendering);
            this.Data2.Rendering += new System.EventHandler(this.Data2__Rendering);
            this.Data3.Rendering += new System.EventHandler(this.Data3__Rendering);
            this.AggregateFunctions = new object[] {
                    this.Text64_Sum,
                    this.Text67_Sum,
                    this.Text46_Sum,
                    this.Text63_Sum,
                    this.Text65_Sum};
            // 
            // Add to PageHeader1.Components
            // 
            this.PageHeader1.Components.Clear();
            this.PageHeader1.Components.AddRange(new Stimulsoft.Report.Components.StiComponent[] {
                        this.Text1,
                        this.Text2,
                        this.Text3,
                        this.Text4,
                        this.Text5,
                        this.Text6,
                        this.Text7,
                        this.Text8,
                        this.Text9,
                        this.Text10,
                        this.Text11,
                        this.Text12,
                        this.Text13,
                        this.Text14,
                        this.Text15,
                        this.Text16,
                        this.Text17,
                        this.Text18,
                        this.Text19,
                        this.Text20,
                        this.Text21,
                        this.Text22,
                        this.Text23,
                        this.Text24,
                        this.Text25,
                        this.Text26,
                        this.HorizontalLine1,
                        this.HorizontalLine2,
                        this.StartPointPrimitive1,
                        this.EndPointPrimitive1,
                        this.HorizontalLine5});
            // 
            // Add to PageHeader2.Components
            // 
            this.PageHeader2.Components.Clear();
            this.PageHeader2.Components.AddRange(new Stimulsoft.Report.Components.StiComponent[] {
                        this.Text27,
                        this.Text28,
                        this.Text29,
                        this.Text30,
                        this.Text31,
                        this.Text32,
                        this.HorizontalLine3});
            // 
            // Add to PageFooter1.Components
            // 
            this.PageFooter1.Components.Clear();
            this.PageFooter1.Components.AddRange(new Stimulsoft.Report.Components.StiComponent[] {
                        this.Text68,
                        this.Text69,
                        this.Text74,
                        this.Text75,
                        this.Text76,
                        this.Text77,
                        this.Text70,
                        this.HorizontalLine13,
                        this.EndPointPrimitive2});
            // 
            // Add to Data1.Components
            // 
            this.Data1.Components.Clear();
            this.Data1.Components.AddRange(new Stimulsoft.Report.Components.StiComponent[] {
                        this.Text33,
                        this.Text34,
                        this.Text35,
                        this.Text36,
                        this.Text37,
                        this.Text38});
            // 
            // Add to Footer4.Components
            // 
            this.Footer4.Components.Clear();
            this.Footer4.Components.AddRange(new Stimulsoft.Report.Components.StiComponent[] {
                        this.Text64,
                        this.Text67,
                        this.Text66,
                        this.HorizontalLine11});
            // 
            // Add to Footer1.Components
            // 
            this.Footer1.Components.Clear();
            this.Footer1.Components.AddRange(new Stimulsoft.Report.Components.StiComponent[] {
                        this.SubReportYarn,
                        this.SubReportFabric});
            // 
            // Add to Page1.Components
            // 
            this.Page1.Components.Clear();
            this.Page1.Components.AddRange(new Stimulsoft.Report.Components.StiComponent[] {
                        this.PageHeader1,
                        this.PageHeader2,
                        this.PageFooter1,
                        this.Data1,
                        this.Footer4,
                        this.Footer1,
                        this.VerticalLine1,
                        this.Rectangle1,
                        this.StartPointPrimitive2});
            // 
            // Add to Header1.Components
            // 
            this.Header1.Components.Clear();
            this.Header1.Components.AddRange(new Stimulsoft.Report.Components.StiComponent[] {
                        this.Text39,
                        this.Text40,
                        this.Text41,
                        this.Text42,
                        this.HorizontalLine4,
                        this.HorizontalLine6});
            // 
            // Add to Data2.Components
            // 
            this.Data2.Components.Clear();
            this.Data2.Components.AddRange(new Stimulsoft.Report.Components.StiComponent[] {
                        this.Text43,
                        this.Text44,
                        this.Text45});
            // 
            // Add to Footer2.Components
            // 
            this.Footer2.Components.Clear();
            this.Footer2.Components.AddRange(new Stimulsoft.Report.Components.StiComponent[] {
                        this.Text46,
                        this.HorizontalLine7});
            // 
            // Add to Sub_Report_2.Components
            // 
            this.Sub_Report_2.Components.Clear();
            this.Sub_Report_2.Components.AddRange(new Stimulsoft.Report.Components.StiComponent[] {
                        this.Header1,
                        this.Data2,
                        this.Footer2});
            // 
            // Add to Header2.Components
            // 
            this.Header2.Components.Clear();
            this.Header2.Components.AddRange(new Stimulsoft.Report.Components.StiComponent[] {
                        this.Text47,
                        this.Text48,
                        this.Text49,
                        this.Text50,
                        this.Text51,
                        this.Text52,
                        this.Text53,
                        this.Text54,
                        this.HorizontalLine8,
                        this.HorizontalLine9});
            // 
            // Add to Data3.Components
            // 
            this.Data3.Components.Clear();
            this.Data3.Components.AddRange(new Stimulsoft.Report.Components.StiComponent[] {
                        this.Text55,
                        this.Text56,
                        this.Text57,
                        this.Text58,
                        this.Text59,
                        this.Text60,
                        this.Text61,
                        this.Text62});
            // 
            // Add to Footer3.Components
            // 
            this.Footer3.Components.Clear();
            this.Footer3.Components.AddRange(new Stimulsoft.Report.Components.StiComponent[] {
                        this.Text63,
                        this.Text65,
                        this.HorizontalLine10});
            // 
            // Add to Sub_Report_1.Components
            // 
            this.Sub_Report_1.Components.Clear();
            this.Sub_Report_1.Components.AddRange(new Stimulsoft.Report.Components.StiComponent[] {
                        this.Header2,
                        this.Data3,
                        this.Footer3});
            // 
            // Add to Pages
            // 
            this.Pages.Clear();
            this.Pages.AddRange(new Stimulsoft.Report.Components.StiPage[] {
                        this.Page1,
                        this.Sub_Report_2,
                        this.Sub_Report_1});
            this.YarnDC.Columns.AddRange(new Stimulsoft.Report.Dictionary.StiDataColumn[] {
                        new Stimulsoft.Report.Dictionary.StiDataColumn("ID", "ID", "ID", typeof(int)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("DcNo", "DcNo", "DcNo", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("Dt", "Dt", "Dt", typeof(DateTime)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("TrType", "TrType", "TrType", typeof(int)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("remark", "remark", "remark", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("delwgt", "delwgt", "delwgt", typeof(decimal)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("OrderNo", "OrderNo", "OrderNo", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("StyleNo", "StyleNo", "StyleNo", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("Deptname", "Deptname", "Deptname", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("OutputType", "OutputType", "OutputType", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("BgRl", "BgRl", "BgRl", typeof(int)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("Kg", "Kg", "Kg", typeof(decimal)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("Pname", "Pname", "Pname", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("Paddress", "Paddress", "Paddress", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("Phone", "Phone", "Phone", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("TIN", "TIN", "TIN", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("CST", "CST", "CST", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("ExporterName", "ExporterName", "ExporterName", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("ExporterAddress", "ExporterAddress", "ExporterAddress", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("Expr2", "Expr2", "Expr2", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("Expr3", "Expr3", "Expr3", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("Expr4", "Expr4", "Expr4", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("PartyDCref", "PartyDCref", "PartyDCref", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("grnwgt", "grnwgt", "grnwgt", typeof(decimal)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("DcPre", "DcPre", "DcPre", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("ColorDesc", "ColorDesc", "ColorDesc", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("CountName", "CountName", "CountName", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("Mill", "Mill", "Mill", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("Heading", "Heading", "Heading", typeof(string))});
            this.YarnDC.Parameters.AddRange(new Stimulsoft.Report.Dictionary.StiDataParameter[] {
                        new Stimulsoft.Report.Dictionary.StiDataParameter("@Id", 8, 0)});
            this.DataSources.Add(this.YarnDC);
            this.YarnSubReport.Columns.AddRange(new Stimulsoft.Report.Dictionary.StiDataColumn[] {
                        new Stimulsoft.Report.Dictionary.StiDataColumn("ID", "ID", "ID", typeof(int)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("Clr", "Clr", "Clr", typeof(int)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("Gsm", "Gsm", "Gsm", typeof(decimal)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("GG", "GG", "GG", typeof(int)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("LL", "LL", "LL", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("Prog", "Prog", "Prog", typeof(decimal)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("ProgMtr", "ProgMtr", "ProgMtr", typeof(decimal)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("Dia", "Dia", "Dia", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("Fabdesc", "Fabdesc", "Fabdesc", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("ColorDesc", "ColorDesc", "ColorDesc", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("CountName", "CountName", "CountName", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("Uom", "Uom", "Uom", typeof(string))});
            this.YarnSubReport.Parameters.AddRange(new Stimulsoft.Report.Dictionary.StiDataParameter[] {
                        new Stimulsoft.Report.Dictionary.StiDataParameter("@Id", 8, 0)});
            this.DataSources.Add(this.YarnSubReport);
            this.FabricsubReport.Columns.AddRange(new Stimulsoft.Report.Dictionary.StiDataColumn[] {
                        new Stimulsoft.Report.Dictionary.StiDataColumn("ID", "ID", "ID", typeof(int)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("Clr", "Clr", "Clr", typeof(int)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("Gsm", "Gsm", "Gsm", typeof(decimal)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("GG", "GG", "GG", typeof(int)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("LL", "LL", "LL", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("Prog", "Prog", "Prog", typeof(decimal)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("ProgMtr", "ProgMtr", "ProgMtr", typeof(decimal)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("Dia", "Dia", "Dia", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("Fabdesc", "Fabdesc", "Fabdesc", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("ColorDesc", "ColorDesc", "ColorDesc", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("CountName", "CountName", "CountName", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("Uom", "Uom", "Uom", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("ItemDesc", "ItemDesc", "ItemDesc", typeof(string))});
            this.FabricsubReport.Parameters.AddRange(new Stimulsoft.Report.Dictionary.StiDataParameter[] {
                        new Stimulsoft.Report.Dictionary.StiDataParameter("@Id", 8, 0)});
            this.DataSources.Add(this.FabricsubReport);
            this.Dictionary.Databases.Add(new Stimulsoft.Report.Dictionary.StiOdbcDatabase("Connection", "Connection", "DSN=JOMS;UID=sa;PWD=;APP=Stimulsoft Reports.Net;WSID=(local);DATABASE=JOMS", false));
            this.YarnDC.Connecting += new System.EventHandler(this.GetYarnDC_SqlCommand);
            this.YarnSubReport.Connecting += new System.EventHandler(this.GetYarnSubReport_SqlCommand);
            this.FabricsubReport.Connecting += new System.EventHandler(this.GetFabricsubReport_SqlCommand);
        }
        
        public void GetYarnDC_SqlCommand(object sender, System.EventArgs e)
        {
            this.YarnDC.SqlCommand = "SELECT     Trs_Del1.ID, RTRIM(CAST(Trs_Del1.DocNo AS varchar)) + \'/\' + Trs_Del1.F" +
"inyear AS DcNo, Trs_Del1.Dt, Trs_Del1.TrType, Trs_Del1.remark, \r\n               " +
"       Trs_Del1.delwgt, RTRIM(CAST(OrderMas.Jobno AS varchar)) + \'/\' + OrderMas." +
"Finyear + \'->\' + OrderMas.BuyOrdNo AS OrderNo, OrderMas.StyleNo, \r\n             " +
"         Mas_Dept.Deptname, Mas_Dept.OutputType, Trs_Del2.BgRl, Trs_Del2.Kg, Mas" +
"_Party.Pname, Mas_Party.Paddress, Mas_Party.Phone, Mas_Party.TIN,\r\n             " +
"          Mas_Party.CST, Mas_Exporter.ExporterName, Mas_Exporter.ExporterAddress" +
", Mas_Exporter.Phone AS Expr2, Mas_Exporter.TIN AS Expr3, \r\n                    " +
"  Mas_Exporter.CST AS Expr4, Trs_Grn1.PartyDCref, Trs_Grn1.grnwgt, Mas_Grp.DcPre" +
", Mas_Color.ColorDesc, Mas_Count.CountName, \r\n                      Mas_Mill.Mil" +
"l,Heading=case Trtype when 1 then \'PROCESS DELIVERY\' WHEN 4 THEN \'PURCHASE RETUR" +
"N\' END\r\nFROM         dbo.Trs_Del1 Trs_Del1 INNER JOIN\r\n                      dbo" +
".Mas_Dept Mas_Dept ON Trs_Del1.Prs_Dept = Mas_Dept.DeptID INNER JOIN\r\n          " +
"            dbo.Trs_Del2 Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID INNER JOIN\r\n     " +
"                 dbo.Mas_Party Mas_Party ON Trs_Del1.Party = Mas_Party.PID INNER" +
" JOIN\r\n                      dbo.Mas_Exporter Mas_Exporter ON Trs_Del1.Coycode =" +
" Mas_Exporter.ExpID INNER JOIN\r\n                      dbo.OrderMas OrderMas ON T" +
"rs_Del1.OrdID = OrderMas.OrdId LEFT OUTER JOIN\r\n                      dbo.Trs_Gr" +
"n1 Trs_Grn1 ON Trs_Del1.OurGRNID = Trs_Grn1.ID INNER JOIN\r\n                     " +
" dbo.StockTable StockTable ON Trs_Del2.StockID = StockTable.StockID LEFT OUTER J" +
"OIN\r\n                      dbo.Mas_Grp Mas_Grp ON Mas_Dept.Grp = Mas_Grp.GrpNo I" +
"NNER JOIN\r\n                      dbo.Mas_Count Mas_Count ON StockTable.CntID = M" +
"as_Count.CountID INNER JOIN\r\n                      dbo.Mas_Mill Mas_Mill ON Stoc" +
"kTable.MillID = Mas_Mill.MillID LEFT OUTER JOIN\r\n                      dbo.Mas_C" +
"olor Mas_Color ON StockTable.ColID = Mas_Color.ColID\r\nwhere Trs_del1.id=?";
            this.YarnDC.Parameters["@Id"].ParameterValue = 0;
        }
        
        public void GetYarnSubReport_SqlCommand(object sender, System.EventArgs e)
        {
            this.YarnSubReport.SqlCommand = ToString(@"SELECT     Trs_Del3.ID, Trs_Del3.Clr, Trs_Del3.Gsm, Trs_Del3.GG, Trs_Del3.LL, Trs_Del3.Prog, Trs_Del3.ProgMtr, Mas_Dia.Dia, Mas_Fabric.Fabdesc, 
	Mas_Color.ColorDesc, Mas_Count.CountName, Mas_Uom.Uom
	FROM         dbo.Trs_Del3 Trs_Del3 INNER JOIN
                      dbo.Mas_Fabric Mas_Fabric ON Trs_Del3.FabType = Mas_Fabric.FabID INNER JOIN
                      dbo.Mas_Dia Mas_Dia ON Trs_Del3.DiaID = Mas_Dia.DiaID LEFT OUTER JOIN
                      dbo.Mas_Count Mas_Count ON Trs_Del3.Cnt = Mas_Count.CountID LEFT OUTER JOIN
                      dbo.Mas_Color Mas_Color ON Trs_Del3.Clr = Mas_Color.ColID LEFT OUTER JOIN
                      dbo.Mas_Uom Mas_Uom ON Mas_Fabric.SecUomID = Mas_Uom.UomID
WHERE     (Trs_Del3.ID = ?) and Fabtype=0");
            this.YarnSubReport.Parameters["@Id"].ParameterValue = 0;
        }
        
        public void GetFabricsubReport_SqlCommand(object sender, System.EventArgs e)
        {
            this.FabricsubReport.SqlCommand = ToString(@"SELECT     Trs_Del3.ID, Trs_Del3.Clr, Trs_Del3.Gsm, Trs_Del3.GG, Trs_Del3.LL, Trs_Del3.Prog, Trs_Del3.ProgMtr, Mas_Dia.Dia, 
	ItemDesc = CASE WHEN Trs_Del3.Clr = 0 THEN Mas_Fabric.Fabdesc + '/' + Countname ELSE Mas_Fabric.Fabdesc + '/' + Countname + '/' + Mas_Color.ColorDesc
                       END,Uom =case when Trs_Del3.ProgMtr>0 then Mas_Uom.Uom else '' end
FROM         dbo.Trs_Del3 Trs_Del3 INNER JOIN
                      dbo.Mas_Fabric Mas_Fabric ON Trs_Del3.FabType = Mas_Fabric.FabID INNER JOIN
                      dbo.Mas_Dia Mas_Dia ON Trs_Del3.DiaID = Mas_Dia.DiaID LEFT OUTER JOIN
                      dbo.Mas_Count Mas_Count ON Trs_Del3.Cnt = Mas_Count.CountID LEFT OUTER JOIN
                      dbo.Mas_Color Mas_Color ON Trs_Del3.Clr = Mas_Color.ColID LEFT OUTER JOIN
                      dbo.Mas_Uom Mas_Uom ON Mas_Fabric.SecUomID = Mas_Uom.UomID
WHERE     (Trs_Del3.ID = ?) and Fabtype>0");
            this.FabricsubReport.Parameters["@Id"].ParameterValue = 0;
        }
        
        #region DataSource YarnDC
        public class YarnDCDataSource : Stimulsoft.Report.Dictionary.StiOdbcSource
        {
            
            public YarnDCDataSource() : 
                    base("Connection", "YarnDC", "YarnDC", "", true, false, 30)
            {
            }
            
            public virtual int ID
            {
                get
                {
                    return ((int)(StiReport.ChangeType(this["ID"], typeof(int), true)));
                }
            }
            
            public virtual string DcNo
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["DcNo"], typeof(string), true)));
                }
            }
            
            public virtual DateTime Dt
            {
                get
                {
                    return ((DateTime)(StiReport.ChangeType(this["Dt"], typeof(DateTime), true)));
                }
            }
            
            public virtual int TrType
            {
                get
                {
                    return ((int)(StiReport.ChangeType(this["TrType"], typeof(int), true)));
                }
            }
            
            public virtual string remark
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["remark"], typeof(string), true)));
                }
            }
            
            public virtual decimal delwgt
            {
                get
                {
                    return ((decimal)(StiReport.ChangeType(this["delwgt"], typeof(decimal), true)));
                }
            }
            
            public virtual string OrderNo
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["OrderNo"], typeof(string), true)));
                }
            }
            
            public virtual string StyleNo
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["StyleNo"], typeof(string), true)));
                }
            }
            
            public virtual string Deptname
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["Deptname"], typeof(string), true)));
                }
            }
            
            public virtual string OutputType
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["OutputType"], typeof(string), true)));
                }
            }
            
            public virtual int BgRl
            {
                get
                {
                    return ((int)(StiReport.ChangeType(this["BgRl"], typeof(int), true)));
                }
            }
            
            public virtual decimal Kg
            {
                get
                {
                    return ((decimal)(StiReport.ChangeType(this["Kg"], typeof(decimal), true)));
                }
            }
            
            public virtual string Pname
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["Pname"], typeof(string), true)));
                }
            }
            
            public virtual string Paddress
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["Paddress"], typeof(string), true)));
                }
            }
            
            public virtual string Phone
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["Phone"], typeof(string), true)));
                }
            }
            
            public virtual string TIN
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["TIN"], typeof(string), true)));
                }
            }
            
            public virtual string CST
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["CST"], typeof(string), true)));
                }
            }
            
            public virtual string ExporterName
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["ExporterName"], typeof(string), true)));
                }
            }
            
            public virtual string ExporterAddress
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["ExporterAddress"], typeof(string), true)));
                }
            }
            
            public virtual string Expr2
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["Expr2"], typeof(string), true)));
                }
            }
            
            public virtual string Expr3
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["Expr3"], typeof(string), true)));
                }
            }
            
            public virtual string Expr4
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["Expr4"], typeof(string), true)));
                }
            }
            
            public virtual string PartyDCref
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["PartyDCref"], typeof(string), true)));
                }
            }
            
            public virtual decimal grnwgt
            {
                get
                {
                    return ((decimal)(StiReport.ChangeType(this["grnwgt"], typeof(decimal), true)));
                }
            }
            
            public virtual string DcPre
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["DcPre"], typeof(string), true)));
                }
            }
            
            public virtual string ColorDesc
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["ColorDesc"], typeof(string), true)));
                }
            }
            
            public virtual string CountName
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["CountName"], typeof(string), true)));
                }
            }
            
            public virtual string Mill
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["Mill"], typeof(string), true)));
                }
            }
            
            public virtual string Heading
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["Heading"], typeof(string), true)));
                }
            }
        }
        #endregion DataSource YarnDC
        
        #region DataSource YarnSubReport
        public class YarnSubReportDataSource : Stimulsoft.Report.Dictionary.StiOdbcSource
        {
            
            public YarnSubReportDataSource() : 
                    base("Connection", "YarnSubReport", "YarnSubReport", "", true, false, 30)
            {
            }
            
            public virtual int ID
            {
                get
                {
                    return ((int)(StiReport.ChangeType(this["ID"], typeof(int), true)));
                }
            }
            
            public virtual int Clr
            {
                get
                {
                    return ((int)(StiReport.ChangeType(this["Clr"], typeof(int), true)));
                }
            }
            
            public virtual decimal Gsm
            {
                get
                {
                    return ((decimal)(StiReport.ChangeType(this["Gsm"], typeof(decimal), true)));
                }
            }
            
            public virtual int GG
            {
                get
                {
                    return ((int)(StiReport.ChangeType(this["GG"], typeof(int), true)));
                }
            }
            
            public virtual string LL
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["LL"], typeof(string), true)));
                }
            }
            
            public virtual decimal Prog
            {
                get
                {
                    return ((decimal)(StiReport.ChangeType(this["Prog"], typeof(decimal), true)));
                }
            }
            
            public virtual decimal ProgMtr
            {
                get
                {
                    return ((decimal)(StiReport.ChangeType(this["ProgMtr"], typeof(decimal), true)));
                }
            }
            
            public virtual string Dia
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["Dia"], typeof(string), true)));
                }
            }
            
            public virtual string Fabdesc
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["Fabdesc"], typeof(string), true)));
                }
            }
            
            public virtual string ColorDesc
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["ColorDesc"], typeof(string), true)));
                }
            }
            
            public virtual string CountName
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["CountName"], typeof(string), true)));
                }
            }
            
            public virtual string Uom
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["Uom"], typeof(string), true)));
                }
            }
        }
        #endregion DataSource YarnSubReport
        
        #region DataSource FabricsubReport
        public class FabricsubReportDataSource : Stimulsoft.Report.Dictionary.StiOdbcSource
        {
            
            public FabricsubReportDataSource() : 
                    base("Connection", "FabricsubReport", "FabricsubReport", "", true, false, 30)
            {
            }
            
            public virtual int ID
            {
                get
                {
                    return ((int)(StiReport.ChangeType(this["ID"], typeof(int), true)));
                }
            }
            
            public virtual int Clr
            {
                get
                {
                    return ((int)(StiReport.ChangeType(this["Clr"], typeof(int), true)));
                }
            }
            
            public virtual decimal Gsm
            {
                get
                {
                    return ((decimal)(StiReport.ChangeType(this["Gsm"], typeof(decimal), true)));
                }
            }
            
            public virtual int GG
            {
                get
                {
                    return ((int)(StiReport.ChangeType(this["GG"], typeof(int), true)));
                }
            }
            
            public virtual string LL
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["LL"], typeof(string), true)));
                }
            }
            
            public virtual decimal Prog
            {
                get
                {
                    return ((decimal)(StiReport.ChangeType(this["Prog"], typeof(decimal), true)));
                }
            }
            
            public virtual decimal ProgMtr
            {
                get
                {
                    return ((decimal)(StiReport.ChangeType(this["ProgMtr"], typeof(decimal), true)));
                }
            }
            
            public virtual string Dia
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["Dia"], typeof(string), true)));
                }
            }
            
            public virtual string Fabdesc
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["Fabdesc"], typeof(string), true)));
                }
            }
            
            public virtual string ColorDesc
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["ColorDesc"], typeof(string), true)));
                }
            }
            
            public virtual string CountName
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["CountName"], typeof(string), true)));
                }
            }
            
            public virtual string Uom
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["Uom"], typeof(string), true)));
                }
            }
            
            public virtual string ItemDesc
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["ItemDesc"], typeof(string), true)));
                }
            }
        }
        #endregion DataSource FabricsubReport
        #endregion StiReport Designer generated code - do not modify
    }
}
