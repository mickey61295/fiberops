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
        public Stimulsoft.Report.Components.StiText Text31;
        public Stimulsoft.Report.Components.StiText Text32;
        public Stimulsoft.Report.Components.StiText Text29;
        public Stimulsoft.Report.Components.StiText Text30;
        public Stimulsoft.Report.Components.StiText Text71;
        public Stimulsoft.Report.Components.StiText Text72;
        public Stimulsoft.Report.Components.StiText Text73;
        public Stimulsoft.Report.Components.StiHorizontalLinePrimitive HorizontalLine3;
        public Stimulsoft.Report.Components.StiPageFooterBand PageFooter1;
        public Stimulsoft.Report.Components.StiText Text68;
        public Stimulsoft.Report.Components.StiText Text69;
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
        public Stimulsoft.Report.Components.StiText Text78;
        public Stimulsoft.Report.Components.StiText Text36;
        public Stimulsoft.Report.Components.StiText Text79;
        public Stimulsoft.Report.Components.StiText Text37;
        public Stimulsoft.Report.Components.StiText Text38;
        public Stimulsoft.Report.Components.StiText Text80;
        public Stimulsoft.Report.Components.StiText Text81;
        public Stimulsoft.Report.Components.StiFooterBand Footer4;
        public Stimulsoft.Report.Components.StiText Text64;
        public Stimulsoft.Report.Dictionary.StiSumDecimalFunctionService Text64_Sum;
        public Stimulsoft.Report.Components.StiText Text67;
        public Stimulsoft.Report.Dictionary.StiSumDecimalFunctionService Text67_Sum;
        public Stimulsoft.Report.Components.StiText Text66;
        public Stimulsoft.Report.Components.StiText Text82;
        public Stimulsoft.Report.Dictionary.StiSumDecimalFunctionService Text82_Sum;
        public Stimulsoft.Report.Components.StiHorizontalLinePrimitive HorizontalLine11;
        public Stimulsoft.Report.Components.StiVerticalLinePrimitive VerticalLine1;
        public Stimulsoft.Report.Components.StiRectanglePrimitive Rectangle1;
        public Stimulsoft.Report.Components.StiStartPointPrimitive StartPointPrimitive2;
        public Stimulsoft.Report.Components.StiWatermark Page1_Watermark;
        public Stimulsoft.Report.Print.StiPrinterSettings Report_PrinterSettings;
        public FabGRNDataSource FabGRN;
        
        public void Text1__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, FabGRN.Heading, true) + " " + ToString(sender, FabGRN.Deptname, true);
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
            e.Value = ToString(sender, FabGRN.ExporterName, true);
        }
        
        public void Text5__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, FabGRN.ExporterAddress, true);
        }
        
        public void Text6__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, FabGRN.ExpPhone, true);
        }
        
        public void Text7__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, FabGRN.ExpTIN, true);
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
            e.Value = ToString(sender, FabGRN.ExpCST, true);
        }
        
        public void Text12__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, FabGRN.Pname, true);
        }
        
        public void Text13__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "To M/S";
        }
        
        public void Text14__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, FabGRN.Paddress, true);
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
            e.Value = ToString(sender, FabGRN.Phone, true);
        }
        
        public void Text19__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, FabGRN.TIN, true);
        }
        
        public void Text20__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, FabGRN.CST, true);
        }
        
        public void Text21__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "GRN NO :";
        }
        
        public void Text22__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, FabGRN.GrnNo, true);
        }
        
        public void Text23__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "Date :";
        }
        
        public void Text24__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = this.Text24.TextFormat.Format(CheckExcelValue(sender, FabGRN.dt));
        }
        
        public void Text25__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "Order No:";
        }
        
        public void Text26__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, FabGRN.OrderNo, true);
        }
        
        public void Text27__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "Slno";
        }
        
        public void Text28__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "FABRIC DESCRIPTION";
        }
        
        public void Text31__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "ROLLS";
        }
        
        public void Text32__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "KGS";
        }
        
        public void Text29__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "GSM";
        }
        
        public void Text30__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "GG";
        }
        
        public void Text71__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "LL";
        }
        
        public void Text72__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "DIA/SIZE";
        }
        
        public void Text73__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "OTHER UOM";
        }
        
        public void Text68__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "Remarks :";
        }
        
        public void Text69__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, FabGRN.remark, true);
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
            e.Value = "For " + ToString(sender, FabGRN.ExporterName, true);
        }
        
        public void Text33__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, Line, true);
        }
        
        public void Text34__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, FabGRN.ItemDesc, true);
        }
        
        public void Text35__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = this.Text35.TextFormat.Format(CheckExcelValue(sender, FabGRN.Gsm));
        }
        
        public void Text78__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, FabGRN.GG, true);
        }
        
        public void Text36__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, FabGRN.ll, true);
        }
        
        public void Text79__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, FabGRN.Dia, true);
        }
        
        public void Text37__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, FabGRN.RBag, true);
        }
        
        public void Text38__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, FabGRN.RecKgs, true);
        }
        
        public void Text80__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = this.Text80.TextFormat.Format(CheckExcelValue(sender, FabGRN.Recmtr));
        }
        
        public void Text81__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = ToString(sender, FabGRN.UOM, true);
        }
        
        public void Text64__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "#%#{Sum(FabGRN.RecKgs)}";
            e.StoreToPrinted = true;
        }
        
        public System.String Text64_GetValue_End(Stimulsoft.Report.Components.StiComponent sender)
        {
            return ToString(sender, ((decimal)(StiReport.ChangeType(this.Text64_Sum.GetValue(), typeof(decimal), true))), true);
        }
        
        public void Text67__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "#%#{Sum(FabGRN.RBag)}";
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
        
        public void Text82__GetValue(object sender, Stimulsoft.Report.Events.StiGetValueEventArgs e)
        {
            e.Value = "#%#{Sum(FabGRN.Recmtr)}";
            e.StoreToPrinted = true;
        }
        
        public System.String Text82_GetValue_End(Stimulsoft.Report.Components.StiComponent sender)
        {
            return this.Text82.TextFormat.Format(CheckExcelValue(sender, ((decimal)(StiReport.ChangeType(this.Text82_Sum.GetValue(), typeof(decimal), true)))));
        }
        
        public void Data1__BeginRender(object sender, System.EventArgs e)
        {
            this.Text64_Sum.Init();
            this.Text64.TextValue = "";
            this.Text67_Sum.Init();
            this.Text67.TextValue = "";
            this.Text82_Sum.Init();
            this.Text82.TextValue = "";
        }
        
        public void Data1__EndRender(object sender, System.EventArgs e)
        {
            this.Text64.SetText(new Stimulsoft.Report.Components.StiGetValue(this.Text64_GetValue_End));
            this.Text67.SetText(new Stimulsoft.Report.Components.StiGetValue(this.Text67_GetValue_End));
            this.Text82.SetText(new Stimulsoft.Report.Components.StiGetValue(this.Text82_GetValue_End));
        }
        
        public void Data1__Rendering(object sender, System.EventArgs e)
        {
            this.Text64_Sum.CalcItem(FabGRN.RecKgs);
            this.Text67_Sum.CalcItem(FabGRN.RBag);
            this.Text82_Sum.CalcItem(FabGRN.Recmtr);
        }
        
        private void InitializeComponent()
        {
            this.FabGRN = new FabGRNDataSource();
            this.NeedsCompiling = false;
            this.Text82_Sum = new Stimulsoft.Report.Dictionary.StiSumDecimalFunctionService();
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
            this.ReportChanged = new DateTime(2009, 8, 1, 16, 12, 20, 250);
            // 
            // ReportCreated
            // 
            this.ReportCreated = new DateTime(2009, 7, 30, 17, 28, 18, 0);
            this.ReportGuid = "f86e2f9e1514453d824dcf3daf167cb6";
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
            this.Text1.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(1.6, 0, 3.8, 0.2);
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
            this.Text4.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
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
            this.Text5.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
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
            this.Text6.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
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
            this.Text7.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
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
            this.Text11.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
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
            this.Text12.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
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
            this.Text14.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
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
            this.Text18.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
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
            this.Text19.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
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
            this.Text20.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
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
            this.Text21.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 1.8, 0.7, 0.2);
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
            this.Text22.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0.7, 1.8, 0.8, 0.2);
            this.Text22.Name = "Text22";
            this.Text22.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text22__GetValue);
            this.Text22.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
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
            this.Text24.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
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
            this.Text26.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
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
            this.Text28.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0.4, 0, 2.7, 0.2);
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
            // Text31
            // 
            this.Text31 = new Stimulsoft.Report.Components.StiText();
            this.Text31.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(5.3, 0, 0.5, 0.2);
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
            this.Text32.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(5.8, 0, 0.8, 0.2);
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
            // Text29
            // 
            this.Text29 = new Stimulsoft.Report.Components.StiText();
            this.Text29.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(3.1, 0, 0.4, 0.2);
            this.Text29.Guid = "4472dd40170e46b5935f99ba93b65809";
            this.Text29.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Center;
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
            this.Text30.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(3.5, 0, 0.4, 0.2);
            this.Text30.Guid = "788c6f6b103843b7a47ea2bc663b732f";
            this.Text30.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Center;
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
            // Text71
            // 
            this.Text71 = new Stimulsoft.Report.Components.StiText();
            this.Text71.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(3.9, 0, 0.6, 0.2);
            this.Text71.Guid = "b0a1fbad205d4c9cb3f5a83bc301c145";
            this.Text71.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Center;
            this.Text71.Name = "Text71";
            this.Text71.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text71__GetValue);
            this.Text71.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text71.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text71.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text71.Font = new System.Drawing.Font("Courier New", 10F, System.Drawing.FontStyle.Bold);
            this.Text71.Interaction = null;
            this.Text71.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text71.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text71.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text72
            // 
            this.Text72 = new Stimulsoft.Report.Components.StiText();
            this.Text72.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(4.5, 0, 0.8, 0.2);
            this.Text72.Guid = "3170d82eb98345e8bfa518072c83254a";
            this.Text72.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Center;
            this.Text72.Name = "Text72";
            this.Text72.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text72__GetValue);
            this.Text72.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text72.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text72.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text72.Font = new System.Drawing.Font("Courier New", 10F, System.Drawing.FontStyle.Bold);
            this.Text72.Interaction = null;
            this.Text72.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text72.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text72.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text73
            // 
            this.Text73 = new Stimulsoft.Report.Components.StiText();
            this.Text73.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(6.6, 0, 0.9, 0.2);
            this.Text73.Guid = "752f2dce2c5249f0a00cfd27f74b84ad";
            this.Text73.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Right;
            this.Text73.Name = "Text73";
            this.Text73.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text73__GetValue);
            this.Text73.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text73.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text73.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text73.Font = new System.Drawing.Font("Courier New", 10F, System.Drawing.FontStyle.Bold);
            this.Text73.Interaction = null;
            this.Text73.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text73.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text73.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
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
            this.Text69.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text69.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text69.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text69.Font = new System.Drawing.Font("Palatino Linotype", 9F);
            this.Text69.Guid = null;
            this.Text69.Interaction = null;
            this.Text69.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text69.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text69.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text75
            // 
            this.Text75 = new Stimulsoft.Report.Components.StiText();
            this.Text75.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0, 0.68, 1.7, 0.2);
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
            this.Text76.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(2.8, 0.68, 1.7, 0.2);
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
            this.Data1.DataSourceName = "FabGRN";
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
            this.Text33.Font = new System.Drawing.Font("Palatino Linotype", 9F);
            this.Text33.Guid = null;
            this.Text33.Interaction = null;
            this.Text33.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text33.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text33.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text34
            // 
            this.Text34 = new Stimulsoft.Report.Components.StiText();
            this.Text34.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(0.4, 0, 2.7, 0.2);
            this.Text34.Name = "Text34";
            this.Text34.ProcessingDuplicates = Stimulsoft.Report.Components.StiProcessingDuplicatesType.Merge;
            this.Text34.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text34__GetValue);
            this.Text34.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text34.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text34.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text34.Font = new System.Drawing.Font("Palatino Linotype", 9F);
            this.Text34.Guid = null;
            this.Text34.Interaction = null;
            this.Text34.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text34.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text34.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text35
            // 
            this.Text35 = new Stimulsoft.Report.Components.StiText();
            this.Text35.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(3.1, 0, 0.4, 0.2);
            this.Text35.HideZeros = true;
            this.Text35.Name = "Text35";
            this.Text35.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text35__GetValue);
            this.Text35.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text35.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text35.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text35.Font = new System.Drawing.Font("Palatino Linotype", 9F);
            this.Text35.Guid = null;
            this.Text35.Interaction = null;
            this.Text35.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text35.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text35.TextFormat = new Stimulsoft.Report.Components.TextFormats.StiNumberFormatService(1, ".", 0, ",", 3, true, false, " ");
            this.Text35.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text78
            // 
            this.Text78 = new Stimulsoft.Report.Components.StiText();
            this.Text78.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(3.5, 0, 0.4, 0.2);
            this.Text78.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Center;
            this.Text78.Name = "Text78";
            this.Text78.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text78__GetValue);
            this.Text78.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text78.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text78.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text78.Font = new System.Drawing.Font("Palatino Linotype", 9F);
            this.Text78.Guid = null;
            this.Text78.Interaction = null;
            this.Text78.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text78.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text78.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text36
            // 
            this.Text36 = new Stimulsoft.Report.Components.StiText();
            this.Text36.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(3.9, 0, 0.6, 0.2);
            this.Text36.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Center;
            this.Text36.Name = "Text36";
            this.Text36.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text36__GetValue);
            this.Text36.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text36.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text36.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text36.Font = new System.Drawing.Font("Palatino Linotype", 9F);
            this.Text36.Guid = null;
            this.Text36.Interaction = null;
            this.Text36.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text36.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text36.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text79
            // 
            this.Text79 = new Stimulsoft.Report.Components.StiText();
            this.Text79.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(4.5, 0, 0.7, 0.2);
            this.Text79.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Center;
            this.Text79.Name = "Text79";
            this.Text79.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text79__GetValue);
            this.Text79.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text79.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text79.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text79.Font = new System.Drawing.Font("Palatino Linotype", 9F);
            this.Text79.Guid = null;
            this.Text79.Interaction = null;
            this.Text79.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text79.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text79.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text37
            // 
            this.Text37 = new Stimulsoft.Report.Components.StiText();
            this.Text37.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(5.3, 0, 0.4, 0.2);
            this.Text37.HideZeros = true;
            this.Text37.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Right;
            this.Text37.Name = "Text37";
            this.Text37.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text37__GetValue);
            this.Text37.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text37.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text37.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text37.Font = new System.Drawing.Font("Palatino Linotype", 9F);
            this.Text37.Guid = null;
            this.Text37.Interaction = null;
            this.Text37.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text37.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text37.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text38
            // 
            this.Text38 = new Stimulsoft.Report.Components.StiText();
            this.Text38.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(5.8, 0, 0.8, 0.2);
            this.Text38.HideZeros = true;
            this.Text38.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Right;
            this.Text38.Name = "Text38";
            this.Text38.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text38__GetValue);
            this.Text38.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text38.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text38.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text38.Font = new System.Drawing.Font("Palatino Linotype", 9F);
            this.Text38.Guid = null;
            this.Text38.Interaction = null;
            this.Text38.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text38.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text38.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text80
            // 
            this.Text80 = new Stimulsoft.Report.Components.StiText();
            this.Text80.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(6.6, 0, 0.6, 0.2);
            this.Text80.HideZeros = true;
            this.Text80.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Right;
            this.Text80.Name = "Text80";
            this.Text80.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text80__GetValue);
            this.Text80.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text80.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text80.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text80.Font = new System.Drawing.Font("Palatino Linotype", 9F);
            this.Text80.Guid = null;
            this.Text80.Interaction = null;
            this.Text80.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text80.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text80.TextFormat = new Stimulsoft.Report.Components.TextFormats.StiNumberFormatService(1, ".", 2, "", 3, true, false, " ");
            this.Text80.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text81
            // 
            this.Text81 = new Stimulsoft.Report.Components.StiText();
            this.Text81.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(7.2, 0, 0.3, 0.2);
            this.Text81.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Center;
            this.Text81.Name = "Text81";
            this.Text81.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text81__GetValue);
            this.Text81.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text81.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text81.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text81.Font = new System.Drawing.Font("Palatino Linotype", 8F);
            this.Text81.Guid = null;
            this.Text81.Interaction = null;
            this.Text81.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text81.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text81.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
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
            this.InitializeComponent2();
        }
        
        public void InitializeComponent2()
        {
            // 
            this.Text64 = new Stimulsoft.Report.Components.StiText();
            this.Text64.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(5.8, 0, 0.8, 0.2);
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
            this.Text64.Font = new System.Drawing.Font("Palatino Linotype", 9F, System.Drawing.FontStyle.Bold);
            this.Text64.Guid = null;
            this.Text64.Interaction = null;
            this.Text64.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text64.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text64.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text67
            // 
            this.Text67 = new Stimulsoft.Report.Components.StiText();
            this.Text67.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(5.1, 0, 0.6, 0.2);
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
            this.Text67.Font = new System.Drawing.Font("Palatino Linotype", 9F, System.Drawing.FontStyle.Bold);
            this.Text67.Guid = null;
            this.Text67.Interaction = null;
            this.Text67.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text67.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text67.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
            // 
            // Text66
            // 
            this.Text66 = new Stimulsoft.Report.Components.StiText();
            this.Text66.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(4.5, 0, 0.7, 0.2);
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
            // Text82
            // 
            this.Text82 = new Stimulsoft.Report.Components.StiText();
            this.Text82.ClientRectangle = new Stimulsoft.Base.Drawing.RectangleD(6.6, 0, 0.6, 0.2);
            this.Text82.Guid = "ad2e51f626f1443896e2f63fd05da431";
            this.Text82.HideZeros = true;
            this.Text82.HorAlignment = Stimulsoft.Base.Drawing.StiTextHorAlignment.Right;
            this.Text82.Name = "Text82";
            // 
            // Text82_Sum
            // 
            this.Text82.GetValue += new Stimulsoft.Report.Events.StiGetValueEventHandler(this.Text82__GetValue);
            this.Text82.Type = Stimulsoft.Report.Components.StiSystemTextType.Expression;
            this.Text82.Border = new Stimulsoft.Base.Drawing.StiBorder(Stimulsoft.Base.Drawing.StiBorderSides.None, System.Drawing.Color.Black, 1, Stimulsoft.Base.Drawing.StiPenStyle.Solid, false, 4, new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black));
            this.Text82.Brush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Transparent);
            this.Text82.Font = new System.Drawing.Font("Palatino Linotype", 9F, System.Drawing.FontStyle.Bold);
            this.Text82.Interaction = null;
            this.Text82.Margins = new Stimulsoft.Report.Components.StiMargins(0, 0, 0, 0);
            this.Text82.TextBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(System.Drawing.Color.Black);
            this.Text82.TextFormat = new Stimulsoft.Report.Components.TextFormats.StiNumberFormatService(1, ".", 2, "", 3, true, false, " ");
            this.Text82.TextOptions = new Stimulsoft.Base.Drawing.StiTextOptions(false, false, false, 0F, System.Drawing.Text.HotkeyPrefix.None, System.Drawing.StringTrimming.None);
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
            this.Text31.Page = this.Page1;
            this.Text31.Parent = this.PageHeader2;
            this.Text32.Page = this.Page1;
            this.Text32.Parent = this.PageHeader2;
            this.Text29.Page = this.Page1;
            this.Text29.Parent = this.PageHeader2;
            this.Text30.Page = this.Page1;
            this.Text30.Parent = this.PageHeader2;
            this.Text71.Page = this.Page1;
            this.Text71.Parent = this.PageHeader2;
            this.Text72.Page = this.Page1;
            this.Text72.Parent = this.PageHeader2;
            this.Text73.Page = this.Page1;
            this.Text73.Parent = this.PageHeader2;
            this.HorizontalLine3.Page = this.Page1;
            this.HorizontalLine3.Parent = this.PageHeader2;
            this.PageFooter1.Page = this.Page1;
            this.PageFooter1.Parent = this.Page1;
            this.Text68.Page = this.Page1;
            this.Text68.Parent = this.PageFooter1;
            this.Text69.Page = this.Page1;
            this.Text69.Parent = this.PageFooter1;
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
            this.Text78.Page = this.Page1;
            this.Text78.Parent = this.Data1;
            this.Text36.Page = this.Page1;
            this.Text36.Parent = this.Data1;
            this.Text79.Page = this.Page1;
            this.Text79.Parent = this.Data1;
            this.Text37.Page = this.Page1;
            this.Text37.Parent = this.Data1;
            this.Text38.Page = this.Page1;
            this.Text38.Parent = this.Data1;
            this.Text80.Page = this.Page1;
            this.Text80.Parent = this.Data1;
            this.Text81.Page = this.Page1;
            this.Text81.Parent = this.Data1;
            this.Footer4.Page = this.Page1;
            this.Footer4.Parent = this.Page1;
            this.Text64.Page = this.Page1;
            this.Text64.Parent = this.Footer4;
            this.Text67.Page = this.Page1;
            this.Text67.Parent = this.Footer4;
            this.Text66.Page = this.Page1;
            this.Text66.Parent = this.Footer4;
            this.Text82.Page = this.Page1;
            this.Text82.Parent = this.Footer4;
            this.HorizontalLine11.Page = this.Page1;
            this.HorizontalLine11.Parent = this.Footer4;
            this.VerticalLine1.Page = this.Page1;
            this.VerticalLine1.Parent = this.Page1;
            this.Rectangle1.Page = this.Page1;
            this.Rectangle1.Parent = this.Page1;
            this.StartPointPrimitive2.Page = this.Page1;
            this.StartPointPrimitive2.Parent = this.Page1;
            this.Data1.BeginRender += new System.EventHandler(this.Data1__BeginRender);
            this.Data1.EndRender += new System.EventHandler(this.Data1__EndRender);
            this.Data1.Rendering += new System.EventHandler(this.Data1__Rendering);
            this.AggregateFunctions = new object[] {
                    this.Text64_Sum,
                    this.Text67_Sum,
                    this.Text82_Sum};
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
                        this.Text31,
                        this.Text32,
                        this.Text29,
                        this.Text30,
                        this.Text71,
                        this.Text72,
                        this.Text73,
                        this.HorizontalLine3});
            // 
            // Add to PageFooter1.Components
            // 
            this.PageFooter1.Components.Clear();
            this.PageFooter1.Components.AddRange(new Stimulsoft.Report.Components.StiComponent[] {
                        this.Text68,
                        this.Text69,
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
                        this.Text78,
                        this.Text36,
                        this.Text79,
                        this.Text37,
                        this.Text38,
                        this.Text80,
                        this.Text81});
            // 
            // Add to Footer4.Components
            // 
            this.Footer4.Components.Clear();
            this.Footer4.Components.AddRange(new Stimulsoft.Report.Components.StiComponent[] {
                        this.Text64,
                        this.Text67,
                        this.Text66,
                        this.Text82,
                        this.HorizontalLine11});
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
                        this.VerticalLine1,
                        this.Rectangle1,
                        this.StartPointPrimitive2});
            // 
            // Add to Pages
            // 
            this.Pages.Clear();
            this.Pages.AddRange(new Stimulsoft.Report.Components.StiPage[] {
                        this.Page1});
            this.FabGRN.Columns.AddRange(new Stimulsoft.Report.Dictionary.StiDataColumn[] {
                        new Stimulsoft.Report.Dictionary.StiDataColumn("GrnNo", "GrnNo", "GrnNo", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("dt", "dt", "dt", typeof(DateTime)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("PartyDCref", "PartyDCref", "PartyDCref", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("PoID", "PoID", "PoID", typeof(int)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("GRNType", "GRNType", "GRNType", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("remark", "remark", "remark", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("grnwgt", "grnwgt", "grnwgt", typeof(decimal)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("RBag", "RBag", "RBag", typeof(int)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("RecKgs", "RecKgs", "RecKgs", typeof(decimal)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("Recmtr", "Recmtr", "Recmtr", typeof(decimal)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("StyleNo", "StyleNo", "StyleNo", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("Pname", "Pname", "Pname", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("Paddress", "Paddress", "Paddress", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("Phone", "Phone", "Phone", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("TIN", "TIN", "TIN", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("CST", "CST", "CST", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("ExporterName", "ExporterName", "ExporterName", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("ExporterAddress", "ExporterAddress", "ExporterAddress", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("ExpPhone", "ExpPhone", "ExpPhone", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("ExpTIN", "ExpTIN", "ExpTIN", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("ExpCST", "ExpCST", "ExpCST", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("Deptname", "Deptname", "Deptname", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("CntID", "CntID", "CntID", typeof(int)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("ColID", "ColID", "ColID", typeof(int)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("Gsm", "Gsm", "Gsm", typeof(decimal)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("GG", "GG", "GG", typeof(int)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("ll", "ll", "ll", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("GRNPre", "GRNPre", "GRNPre", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("Fabdesc", "Fabdesc", "Fabdesc", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("Dia", "Dia", "Dia", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("CountName", "CountName", "CountName", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("ColorDesc", "ColorDesc", "ColorDesc", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("RefNo", "RefNo", "RefNo", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("OrderNo", "OrderNo", "OrderNo", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("UOM", "UOM", "UOM", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("ItemDesc", "ItemDesc", "ItemDesc", typeof(string)),
                        new Stimulsoft.Report.Dictionary.StiDataColumn("Heading", "Heading", "Heading", typeof(string))});
            this.FabGRN.Parameters.AddRange(new Stimulsoft.Report.Dictionary.StiDataParameter[] {
                        new Stimulsoft.Report.Dictionary.StiDataParameter("@Id", 8, 0)});
            this.DataSources.Add(this.FabGRN);
            this.Dictionary.Databases.Add(new Stimulsoft.Report.Dictionary.StiOdbcDatabase("Connection", "Connection", "DSN=JOMS;UID=sa;PWD=;APP=Stimulsoft Reports.Net;WSID=(local);DATABASE=JOMS", false));
            this.FabGRN.Connecting += new System.EventHandler(this.GetFabGRN_SqlCommand);
        }
        
        public void GetFabGRN_SqlCommand(object sender, System.EventArgs e)
        {
            this.FabGRN.SqlCommand = "SELECT     RTRIM(CAST(Trs_Grn1.DocNo AS varchar)) + \'/\' + Trs_Grn1.Finyear AS Grn" +
"No, Trs_Grn1.dt, Trs_Grn1.PartyDCref, Trs_Grn1.PoID, Trs_Grn1.GRNType, \r\n       " +
"               Trs_Grn1.remark, Trs_Grn1.grnwgt, Trs_GRN2.RBag, Trs_GRN2.RecKgs," +
" Trs_GRN2.Recmtr, OrderMas.StyleNo, Mas_Party.Pname, \r\n                      Mas" +
"_Party.Paddress, Mas_Party.Phone, Mas_Party.TIN, Mas_Party.CST, Mas_Exporter.Exp" +
"orterName, Mas_Exporter.ExporterAddress, \r\n                      Mas_Exporter.Ph" +
"one AS ExpPhone, Mas_Exporter.TIN AS ExpTIN, Mas_Exporter.CST AS ExpCST, Mas_Dep" +
"t.Deptname, StockTable.CntID, \r\n                      StockTable.ColID, StockTab" +
"le.Gsm, StockTable.GG, StockTable.ll, Mas_Grp.GRNPre, Mas_Fabric.Fabdesc, Mas_Di" +
"a.Dia, Mas_Count.CountName, \r\n                      Mas_Color.ColorDesc, RefNo =" +
" CASE WHEN trs_grn1.POId > 0 THEN RTRIM(CAST(Trs_Po1.DocNo AS varchar)) \r\n      " +
"                + \'/\' + Trs_Po1.Finyear ELSE rtrim(cast(Trs_Del1.DocNo AS varcha" +
"r)) + \'/\' + Trs_Del1.Finyear END, RTRIM(CAST(OrderMas.Jobno AS varchar)) \r\n     " +
"                 + \'/\' + OrderMas.Finyear + \'->\' + OrderMas.BuyOrdNo AS OrderNo," +
" UOM = CASE WHEN Trs_Grn2.Recmtr > 0 THEN Mas_Uom.Uom ELSE \'\' END, \r\n           " +
"           ItemDesc = CASE WHEN StockTable.ColID > 0 THEN fabdesc + \'/\' + Countn" +
"ame + \'/\' + colordesc ELSE fabdesc + \'/\' + Countname END\r\n                      " +
",Heading=Case Grntype when \'Purchase\' then \'GOODS RECEIVED NOTE\' when \'Process\' " +
"then \'PROCESS RECEIPT\' when \'Process Return\' then \'PROCESS RETURN\' end \r\nFROM   " +
"      dbo.Trs_Grn1 Trs_Grn1 INNER JOIN\r\n                      dbo.OrderMas Order" +
"Mas ON Trs_Grn1.OrdID = OrderMas.OrdId INNER JOIN\r\n                      dbo.Trs" +
"_GRN2 Trs_GRN2 ON Trs_Grn1.ID = Trs_GRN2.ID INNER JOIN\r\n                      db" +
"o.Mas_Party Mas_Party ON Trs_Grn1.SuppID = Mas_Party.PID INNER JOIN\r\n           " +
"           dbo.Mas_Exporter Mas_Exporter ON Trs_Grn1.Coycode = Mas_Exporter.ExpI" +
"D LEFT OUTER JOIN\r\n                      dbo.Mas_Dept Mas_Dept ON Trs_Grn1.Dept " +
"= Mas_Dept.DeptID LEFT OUTER JOIN\r\n                      dbo.Trs_Del1 Trs_Del1 O" +
"N Trs_Grn1.DCID = Trs_Del1.ID LEFT OUTER JOIN\r\n                      dbo.Trs_Po1" +
" Trs_Po1 ON Trs_Grn1.PoID = Trs_Po1.ID INNER JOIN\r\n                      dbo.Sto" +
"ckTable StockTable ON Trs_GRN2.StockID = StockTable.StockID LEFT OUTER JOIN\r\n   " +
"                   dbo.Mas_Grp Mas_Grp ON Mas_Dept.Grp = Mas_Grp.GrpNo INNER JOI" +
"N\r\n                      dbo.Mas_Dia Mas_Dia ON StockTable.DiaID = Mas_Dia.DiaID" +
" INNER JOIN\r\n                      dbo.Mas_Fabric Mas_Fabric ON StockTable.FabID" +
" = Mas_Fabric.FabID LEFT OUTER JOIN\r\n                      dbo.Mas_Color Mas_Col" +
"or ON StockTable.ColID = Mas_Color.ColID LEFT OUTER JOIN\r\n                      " +
"dbo.Mas_Count Mas_Count ON StockTable.CntID = Mas_Count.CountID LEFT OUTER JOIN\r" +
"\n                      dbo.Mas_Uom Mas_Uom ON Mas_Fabric.SecUomID = Mas_Uom.UomI" +
"D\r\nwhere Trs_GRN1.id=?\r\nORDER BY FABDESC +\'/\'+COUNTNAME +\'/\'+COLORDESC,StockTabl" +
"e.GSM,StockTable.GG,StockTable.LL,Mas_Dia.DIA";
            this.FabGRN.Parameters["@Id"].ParameterValue = 0;
        }
        
        #region DataSource FabGRN
        public class FabGRNDataSource : Stimulsoft.Report.Dictionary.StiOdbcSource
        {
            
            public FabGRNDataSource() : 
                    base("Connection", "FabGRN", "FabGRN", "", true, false, 30)
            {
            }
            
            public virtual string GrnNo
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["GrnNo"], typeof(string), true)));
                }
            }
            
            public virtual DateTime dt
            {
                get
                {
                    return ((DateTime)(StiReport.ChangeType(this["dt"], typeof(DateTime), true)));
                }
            }
            
            public virtual string PartyDCref
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["PartyDCref"], typeof(string), true)));
                }
            }
            
            public virtual int PoID
            {
                get
                {
                    return ((int)(StiReport.ChangeType(this["PoID"], typeof(int), true)));
                }
            }
            
            public virtual string GRNType
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["GRNType"], typeof(string), true)));
                }
            }
            
            public virtual string remark
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["remark"], typeof(string), true)));
                }
            }
            
            public virtual decimal grnwgt
            {
                get
                {
                    return ((decimal)(StiReport.ChangeType(this["grnwgt"], typeof(decimal), true)));
                }
            }
            
            public virtual int RBag
            {
                get
                {
                    return ((int)(StiReport.ChangeType(this["RBag"], typeof(int), true)));
                }
            }
            
            public virtual decimal RecKgs
            {
                get
                {
                    return ((decimal)(StiReport.ChangeType(this["RecKgs"], typeof(decimal), true)));
                }
            }
            
            public virtual decimal Recmtr
            {
                get
                {
                    return ((decimal)(StiReport.ChangeType(this["Recmtr"], typeof(decimal), true)));
                }
            }
            
            public virtual string StyleNo
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["StyleNo"], typeof(string), true)));
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
            
            public virtual string ExpPhone
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["ExpPhone"], typeof(string), true)));
                }
            }
            
            public virtual string ExpTIN
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["ExpTIN"], typeof(string), true)));
                }
            }
            
            public virtual string ExpCST
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["ExpCST"], typeof(string), true)));
                }
            }
            
            public virtual string Deptname
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["Deptname"], typeof(string), true)));
                }
            }
            
            public virtual int CntID
            {
                get
                {
                    return ((int)(StiReport.ChangeType(this["CntID"], typeof(int), true)));
                }
            }
            
            public virtual int ColID
            {
                get
                {
                    return ((int)(StiReport.ChangeType(this["ColID"], typeof(int), true)));
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
            
            public virtual string ll
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["ll"], typeof(string), true)));
                }
            }
            
            public virtual string GRNPre
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["GRNPre"], typeof(string), true)));
                }
            }
            
            public virtual string Fabdesc
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["Fabdesc"], typeof(string), true)));
                }
            }
            
            public virtual string Dia
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["Dia"], typeof(string), true)));
                }
            }
            
            public virtual string CountName
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["CountName"], typeof(string), true)));
                }
            }
            
            public virtual string ColorDesc
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["ColorDesc"], typeof(string), true)));
                }
            }
            
            public virtual string RefNo
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["RefNo"], typeof(string), true)));
                }
            }
            
            public virtual string OrderNo
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["OrderNo"], typeof(string), true)));
                }
            }
            
            public virtual string UOM
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["UOM"], typeof(string), true)));
                }
            }
            
            public virtual string ItemDesc
            {
                get
                {
                    return ((string)(StiReport.ChangeType(this["ItemDesc"], typeof(string), true)));
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
        #endregion DataSource FabGRN
        #endregion StiReport Designer generated code - do not modify
    }
}
