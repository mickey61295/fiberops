/*;=============================================   

; Author           :  Global Software's    
; Create date      :  05/11/2022    
; Create By        :  ASLAM 
; Description      :  SP FOR SALES INVOICE
; Change Person    :  ASLAM
; Last Change Date :  03/02/2026 10.07 AM 
; =============================================  */  

CREATE PROCEDURE SP_PcsDcPrintQry (@Id Varchar(100),@Sqlcond Varchar(1000),@coycode Varchar(10)) AS 

BEGIN 



DECLARE @sql1 NVARCHAR(MAX);



SET      @Sql1 = 'SELECT Distinct Mas_JobWrkComp.ID as StageID,isnull(mas_exporter.Unit_ParentConcernID,'''') Unit_ParentConcernID, RTRIM(CAST(Trs_Pcs1.DocNo AS varchar)) DCNo, Trs_Pcs1.Finyear AS DcFinyear,Trs_Pcs1.dtDCDate, Trs_Pcs1.DelType,  Trs_Pcs1.NoBdl, Trs_Pcs1.Wgt, Trs_Pcs1.
Remark, RTRIM(CAST(OrderMas.Jobno AS varchar)) as JobNo,OrderMas.Finyear as OrdFinyear,OrderMas.BuyOrdNo AS OrderNo, Trs_Pcs2.StyleNo,Mas_Exporter.ExporterName, Mas_Dept.DCFormat, Mas_Exporter.ExporterAddress, Mas_Exporter.Phone, Mas_Exporter.TIN, Mas_Exporter.CST,Mas_Exporter.pan AS PAN, Case When Trs_Pcs1.DelType = ''Unit Transfer-Panel'' Then Mas_Unit.ExporterName Else Mas_Party.Pname END as Pname,  Case When Trs_Pcs1.DelType=''Unit Transfer-Panel'' Then Mas_Unit.ExpID Else   Mas_Party.Pid End as PId,Case When Trs_Pcs1.DelType = ''Unit Transfer-Panel'' Then Mas_Unit.ExporterAddress Else Mas_Party.Paddress End as Paddress,  Case When Trs_Pcs1.DelType = ''Unit Transfer-Panel'' Then Mas_Unit.Phone Else  Mas_Party.Phone END AS PPhone,  Case When Trs_Pcs1.DelType = ''Unit Transfer-Panel'' Then Mas_Unit.TIN Else Mas_Party.TIN End as PTIN,  Case When Trs_Pcs1.DelType = ''Unit Transfer-Panel'' Then Mas_Unit.CST Else  Mas_Party.CST END AS PCST, Mas_Dept.Deptname, Mas_JobWrkComp.WorkComplDet, Mas_Panel.PanelName
, Mas_Buyer.ShortBuyer as BuyerName, Mas_Buyer.BuyerName as BuyerName1, Mas_Color.ColorDesc, Mas_StyleDesc.StyleDesc, dbo.Mas_Part.PartName, dbo.Mas_Terms.Terms,Gpno,isnull(options.GatePassFlg,''N'') as GatePassFlg ,case when Trs_Pcs1.DelType = ''Unit Transfer-Panel'' then ''UNIT TRANSFER - PANEL'' else case when isnull(Trs_Pcs1.ProcessType,''P'')=''P'' then ''PROCESS DELIVERY CHALLAN'' else ''REPROCESS DELIVERY CHALLAN'' end  end AS ProcessType,Tardt,Mas_Exporter.IoNoCaption, Mas_User.UserName,Ordermas.ordertype,Mas_RejectionType.RejectionType,IsNull(Mas_Exporter.GSTNo,'''') As GSTNo,IsNull(Mas_Party.GSTNo,'''') As PGSTNo,IsNull(Mas_HSN.HSNCode,'''') as HSNCode,EwayBillNo,EwayBillDt,IsNull((trs_pcs2.pcs*Pro_Prod_PartwiseRate.cost),0) as amount,IsNull(LotNo,'''') as LotNo,OrderMas.OrdId,trs_pcs2.Colid,Trs_Pcs2.PartID,IsNull(Mas_Vehicle.VName,'''') as VehicleNo,isnull(BitFormDesignDesc,'''') As BitFormDesignDesc,BudPoDet.Rate,Mas_HSN1.HSNDesc,Sum(Trs_Pcs2.Pcs)*BudPoDet.Rate As Amount1,isnull(Mas_Exporter.EMailid,'''') EMailid,ISNULL(Mas_Season.SeasDesc,'''') SeasDesc ,isnull(Mas_Exporter_Concern.ExporterName,Mas_Exporter.ExporterName) as Parent_ExporterName,isnull(Mas_Exporter_Concern.ExporterAddress,Mas_Exporter.ExporterAddress )as Parent_ExporterAddress 


,isnull(trs_pcs2.CompID,0)CompID,0 as BatchNo FROM   dbo.Trs_Pcs1 Trs_Pcs1 INNER JOIN dbo.Mas_Exporter Mas_Exporter ON Trs_Pcs1.Coycode = Mas_Exporter.ExpID LEFT OUTER JOIN  dbo.Mas_Party Mas_Party ON Trs_Pcs1.Party = Mas_Party.PID INNER JOIN  dbo.Trs_Pcs2 Trs_Pcs2 ON Trs_Pcs1.ID = Trs_Pcs2.ID INNER 



JOIN dbo.OrderMas OrderMas ON Trs_Pcs1.Ordjobno = OrderMas.OrdId LEFT OUTER JOIN	 dbo.Mas_Buyer Mas_Buyer ON OrderMas.BuyerID = Mas_Buyer.BuyerID LEFT OUTER JOIN	 dbo.Mas_Season Mas_Season ON OrderMas.Season = Mas_Season.SeasID ' 















SET @sql1 = @sql1 +  @Sqlcond  















SET @sql1 = @sql1 + 'Left outer join Mas_RejectionType on Mas_RejectionType.RejectionTypeId = Trs_Pcs1.RejectionTypeId LEFT OUTER JOIN  dbo.Mas_JobWrkComp Mas_JobWrkComp ON Trs_Pcs1.TargetStageId = Mas_JobWrkComp.Id LEFT OUTER JOIN  dbo.Mas_Dept Mas_Dept 
ON Trs_Pcs1.Dept = Mas_Dept.DeptID INNER JOIN dbo.Mas_Color Mas_Color ON Trs_Pcs2.ColID = Mas_Color.ColID INNER JOIN dbo.Mas_Size Mas_Size ON Trs_Pcs2.SizeID = Mas_Size.SizeID INNER JOIN dbo.Mas_StyleDesc Mas_StyleDesc ON Trs_Pcs2.StyleID = Mas_StyleDesc.


StyleID LEFT OUTER JOIN  dbo.Mas_Terms ON Mas_Dept.DC_TermCode = dbo.Mas_Terms.ID LEFT OUTER JOIN  dbo.Mas_Part ON Trs_Pcs2.PartID = dbo.Mas_Part.PartID LEFT OUTER JOIN dbo.Mas_Panel Mas_Panel ON Trs_Pcs2.PanelID = Mas_Panel.PanelID LEFT OUTER JOIN  dbo.Mas_Exporter Mas_Unit ON Trs_Pcs1.ToCoyCode = Mas_Unit.ExpID LEFT OUTER JOIN Mas_User ON Trs_Pcs1.PreparedBy = Mas_User.UserCode left join mas_hsn on case when (select PcsType from Mas_JobWrkComp where id=trs_pcs1.TargetStageID)=''Panel'' then (select Mas_HSNPce.HSNID from Mas_HSNPce where Mas_HSNPce.PceStage=''BitForm'') else case when (select SEMIFINISH from mas_dept where deptid=trs_pcs1.dept)=''S'' then (select Mas_HSNPce.HSNID from Mas_HSNPce where Mas_HSNPce.PceStage=''SemiFinished'') else case when 


(select SEMIFINISH from mas_dept where deptid=trs_pcs1.dept)=''F'' then (select Mas_HSNPce.HSNID from Mas_HSNPce where Mas_HSNPce.PceStage=''Finished'') end  end end=mas_hsn.id left join Pro_Prod_PartwiseRate on trs_pcs1.Ordjobno=Pro_Prod_PartwiseRate.ordid  and trs_pcs2.StyleNo=Pro_Prod_PartwiseRate.styleno and trs_pcs1.TargetStageID=Pro_Prod_PartwiseRate.wrkid and trs_pcs2.partid=Pro_Prod_PartwiseRate.partid Left Join Mas_Vehicle ON Trs_Pcs1.VehicleCode=Mas_Vehicle.Code left join BudPoMas On   BudPoMas.
PartyId=Trs_Pcs1.Party And BudPoMas.Ordid=Trs_Pcs1.Ordjobno And trs_Pcs1.TargetStageID=BudPoMas.DeptId  Left Join BudPoDet on BudPoDet.ColId=Trs_Pcs2.ColID And BudPoDet.Size=Trs_Pcs2.SizeID And BudPoDet.PartID=Trs_Pcs2.PartID And BudPoDet.StyleID=Trs_Pcs2.StyleID And BudPoDet.Styleno=Trs_Pcs2.StyleNo and  BudPoDet.Id=BudPoMas.Id    left Join Mas_HSN As Mas_HSN1 on Mas_HSN1.Id=BudPoDet.HSNId  LEFT JOIN dbo.Mas_Exporter as Mas_Exporter_Concern ON Mas_exporter.Unit_ParentConcernID = Mas_Exporter_Concern.ExpID cross join Options  where Trs_Pcs1.id=''' + @ID + ''' and Coycode='''+ @Coycode + ''' Group by Trs_Pcs1.DocNo,Trs_Pcs1.Finyear,Trs_Pcs1.dtDCDate, Trs_Pcs1.DelType,  Trs_Pcs1.NoBdl, Trs_Pcs1.Wgt, Trs_Pcs1.Remark,OrderMas.Jobno,OrderMas.Finyear,OrderMas.BuyOrdNo,Trs_Pcs2.StyleNo,Mas_Exporter.ExporterName, Mas_Dept.DCFormat, Mas_Exporter.ExporterAddress, Mas_Exporter.Phone, Mas_Exporter.TIN, Mas_Exporter.CST,Mas_Exporter.pan,Trs_Pcs1.DelType,Mas_Unit.ExporterName,Mas_Party.Pname, Mas_Unit.ExpID,Mas_Party.Pid,Mas_Unit.ExporterAddress,Mas_Party.Paddress, Mas_Unit.Phone, Mas_Party.Phone,Mas_Unit.TIN , Mas_Party.TIN,Mas_Unit.CST ,  Mas_Party.CST, Mas_Dept.Deptname, Mas_JobWrkComp.WorkComplDet, Mas_Panel.PanelName, Mas_Buyer.BuyerName ,Mas_Color.ColorDesc, Mas_StyleDesc.StyleDesc, dbo.Mas_Part.PartName, dbo.Mas_Terms.Terms,Gpno,options.GatePassFlg,Trs_Pcs1.ProcessType,Tardt,Mas_Exporter.IoNoCaption, Mas_User.UserName,Ordermas.ordertype,Mas_RejectionType.RejectionType,Mas_Exporter.GSTNo,Mas_Party.GSTNo,Mas_HSN.HSNCode,EwayBillNo,EwayBillDt,



trs_pcs2.pcs*Pro_Prod_PartwiseRate.cost,LotNo,OrderMas.OrdId,trs_pcs2.Colid,Trs_Pcs2.PartID,Mas_Vehicle.VName,BitFormDesignDesc,BudPoDet.Rate,



Mas_HSN1.HSNDesc,BudPoDet.Rate,Mas_Exporter.EMailid, Mas_Buyer.ShortBuyer,ISNULL(Mas_Season.SeasDesc,'''') ,isnull(Mas_Exporter_Concern.ExporterName,Mas_Exporter.ExporterName) ,isnull(Mas_Exporter_Concern.ExporterAddress,Mas_Exporter.ExporterAddress ), isnull(mas_exporter.Unit_ParentConcernID,''''),isnull(trs_pcs2.CompID,0),Mas_JobWrkComp.Id'







print @Sql1







EXEC sp_executesql @sql1 















END