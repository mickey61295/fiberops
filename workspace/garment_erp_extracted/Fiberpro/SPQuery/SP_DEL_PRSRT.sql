/*

;=============================================

; Author		: Global Software's

; Create date		: 17/02/2025

; Create By		: M.SUGANYA

; Description		: QRY

; Change Person		: SWETHA

; Last Change Date	: 10/04/2025 10.45 AM

; =============================================	

*/



CREATE PROCEDURE SP_DEL_PRSRT (@Id Varchar(Max))  AS 



BEGIN



DECLARE @sql1 NVARCHAR(MAX);



SET @sql1 = 'ALTER VIEW VUE_DEL_PRSRT AS 



SELECT    Trs_Del1.ID, CASE WHEN len(rtrim(dcpre)) < 1 or isnull(len(rtrim(dcpre)),'''')=''''  THEN RTRIM(CAST(Trs_Del1.DocNo AS varchar)) + ''/'' + Trs_Del1.Finyear ELSE rtrim(dcpre) 

                      + ''-'' + RTRIM(CAST(Trs_Del1.DocNo AS varchar)) + ''/'' + Trs_Del1.Finyear END AS DcNo, Trs_Del1.Dt, Trs_Del1.TrType, Trs_Del1.Prs_Dept, Trs_Del1.delwgt, 

                      CASE WHEN ordermas.jobno = 0 THEN ''<General>'' + ''/'' + OrderMas.Finyear + ''->'' + OrderMas.BuyOrdNo ELSE RTRIM(CAST(OrderMas.Jobno AS varchar)) 

                      + ''/'' + OrderMas.Finyear + ''->'' + OrderMas.BuyOrdNo END AS OrderNo,  Mas_Dept.Deptname, Mas_Dept.OutputType, Trs_Del2.BgRl, Trs_Del2.Kg, 

                      Trs_Del2.mtr, CASE WHEN Trs_Del1.PartyUnit = ''P'' THEN Mas_Party.Pname ELSE Mas_Unit.ExporterName END AS Pname, 

                      CASE WHEN Trs_Del1.PartyUnit = ''P'' THEN Mas_Party.Paddress ELSE Mas_Unit.ExporterAddress END AS Paddress, 

                      CASE WHEN Trs_Del1.PartyUnit = ''P'' THEN Mas_Party.Phone ELSE Mas_Unit.Phone END AS Phone, 

                      CASE WHEN Trs_Del1.PartyUnit = ''P'' THEN Mas_Party.TIN ELSE Mas_Unit.TIN END AS TIN, 

                      CASE WHEN Trs_Del1.PartyUnit = ''P'' THEN Mas_Party.CST ELSE Mas_Unit.CST END AS CST, Mas_Exporter.ExporterName, Mas_Dept.DCFormat, 

                      Mas_Buyer.BuyerName, Mas_Exporter.ExporterAddress, Mas_Exporter.Phone AS ExpPhone, Mas_Exporter.TIN AS ExpTIN, Mas_Exporter.CST AS ExpCST,Mas_Exporter.pan AS PAN,

                      Trs_Grn1.PartyDCref, StockTable.CntID, StockTable.ColID, Case When IsNull(Mas_Dept.DeptType,''G'')=''G'' Then StockTable.Gsm Else StockTable.FinGsm End As Gsm, StockTable.GG, StockTable.ll, Mas_Grp.DcPre, Mas_Fabric.Fabdesc, Mas_Dia.Dia, Mas_Dia_2.Dia as FDia,

                      Mas_Color.ColorDesc, Mas_Count.CountName, Trs_Del1.remark, Trs_Del1.ProcessType, Trs_Del1.LotNo, ISNULL(StockTable.LotNo,'''') AS StkLotno, 

                      CASE WHEN TRS_DEL2.MTR > 0 THEN Mas_Uom.Uom ELSE '''' END AS UOM, 

                      CASE WHEN StockTable.ColID > 0 THEN FABDESC + ''/'' + COUNTNAME + ''/'' + COLORDESC ELSE FABDESC + ''/'' + COUNTNAME END AS ITEMDESC, 

                      CASE Trtype WHEN 1 THEN ''DELIVERY CHALLAN'' WHEN 4 THEN ''PURCHASE RETURN'' WHEN 13 THEN ''PARTY REJECTION RETURN'' END AS Heading, 

                      Mas_Vehicle.VName, Mas_Terms.Terms, 





                      CASE WHEN StockTable.ColID > 0 THEN  case when  StockTable.Print_designid>0 then  fabdesc + Countname + COLORDESC + RTRIM(CAST(StockTable.ColID AS varchar))+ RTRIM(CAST(StockTable.Gsm AS varchar)) + RTRIM(CAST(StockTable.GG AS varchar)) + RTRIM(CAST(StockTable.ll AS varchar)) + RTRIM(CAST(Mas_Dia.Dia AS varchar)) + RTRIM(CAST(Mas_Dia_2.Dia AS varchar)) + Mas_design.designdesc

else

fabdesc + Countname + COLORDESC + RTRIM(CAST(StockTable.ColID AS varchar))+ RTRIM(CAST(StockTable.Gsm AS varchar)) + RTRIM(CAST(StockTable.GG AS varchar)) + RTRIM(CAST(StockTable.ll AS varchar)) + RTRIM(CAST(Mas_Dia.Dia AS varchar)) + RTRIM(CAST(Mas_Dia_2.Dia AS varchar))

end 



ELSE 

case when  StockTable.Print_designid>0 then 

fabdesc + Countname + RTRIM(CAST(StockTable.ColID AS varchar)) + RTRIM(CAST(StockTable.Gsm AS varchar)) 

                      + RTRIM(CAST(StockTable.GG AS varchar)) + RTRIM(CAST(StockTable.ll AS varchar)) + RTRIM(CAST(Mas_Dia.Dia AS varchar))+Mas_design.designdesc+ RTRIM(CAST(Mas_Dia_2.Dia AS varchar))

else

fabdesc + Countname + RTRIM(CAST(StockTable.ColID AS varchar)) + RTRIM(CAST(StockTable.Gsm AS varchar)) 

                      + RTRIM(CAST(StockTable.GG AS varchar)) + RTRIM(CAST(StockTable.ll AS varchar)) + RTRIM(CAST(Mas_Dia.Dia AS varchar)) + RTRIM(CAST(Mas_Dia_2.Dia AS varchar)) end 

 END AS GrpHeader, Trs_Del1.GPNo, 

                      ISNULL(Mas_Dept.ProgReqPrn, ''N'') AS ProgReqPrn, ISNULL(Options.GatePassFlg, ''N'') AS GatePassFlg, ISNULL(Mas_Design.DesignDesc, '''') AS DesignDesc, 

                      Trs_Del1.TarDt, Mas_User.Username, 

                      CASE WHEN Preprint.DcRateReqd = 1 THEN CASE WHEN Trs_Del1.ProcessType = ''P'' THEN CASE Ordermas.Jobno WHEN 0 THEN Trs_Del3.GeneralRate ELSE CASE Isnull(Mas_Dept.ProgFrm_Issue,

                       ''N'') WHEN ''Y'' THEN CASE Isnull(BudPodet.Rate, 0) WHEN 0 THEN Pro_ReqKnitt2.Rate ELSE BudPodet.Rate END ELSE 0 END END ELSE 0 END ELSE 0 END AS Rate,

                       CASE WHEN Preprint.DcRateReqd = 1 THEN CASE WHEN Trs_Del1.ProcessType = ''P'' THEN CASE Isnull(Mas_Dept.ProgFrm_Issue, ''N'') 

                      WHEN ''Y'' THEN ''Rate'' ELSE '''' END ELSE '''' END ELSE '''' END AS Ratelbl,

					  CASE  Mas_Design.DesignDesc WHEN NULL THEN '''' ELSE ''DESIGN'' END AS DesignLbL,

					  case when Trs_del1.Prs_dept =10 then Mas_design_1.designdesc else mas_design.DesignDesc end as  Deldesign,

CASE WHEN Trs_Del1.PartyUnit = ''U'' then cuttingunit.exportername else '''' end as cuttingunit,GodName,mas_exporter.IoNoCaption,Mas_Party.PAN As PPAN,IsNull(Mas_Dept.DeptType,''G'') As DeptType

,IsNull(Mas_Exporter.GSTNo,'''') As GSTNo,

CASE WHEN Trs_Del1.PartyUnit = ''P'' THEN Mas_Party.GSTNo ELSE Mas_Unit.GSTNo END AS PGSTNo, 



IsNull(Mas_HSN.HSNCode,'''') As HSNCode,EwayBillNo,EwayBillDt,(Trs_Del2.Kg*Pro_ReqKnitt2.Cost) As Amount /*(Trs_Del2.Kg*Pro_ReqKnitt2_2.Cost) As Amount*/, StockTable.FabID , Mas_Dia.DiaId, Mas_Dia_2.DiaId as FDiaID, Trs_Del2.OrdId

FROM         Mas_Terms AS Mas_Terms RIGHT OUTER JOIN

                      Trs_Del1 AS Trs_Del1 INNER JOIN

                      Mas_Dept AS Mas_Dept ON Trs_Del1.Prs_Dept = Mas_Dept.DeptID INNER JOIN

                      Trs_Del2 AS Trs_Del2 ON Trs_Del1.ID = Trs_Del2.ID LEFT OUTER JOIN

                      Mas_Party AS Mas_Party ON Trs_Del1.Party = Mas_Party.PID INNER JOIN

                      Mas_Exporter AS Mas_Exporter ON Trs_Del1.Coycode = Mas_Exporter.ExpID INNER JOIN

                      OrderMas AS OrderMas ON Trs_Del2.OrdId = OrderMas.OrdId 

LEFT OUTER JOIN

                      Trs_Grn1 AS Trs_Grn1 ON Trs_Del1.OurGRNID = Trs_Grn1.ID INNER JOIN

                      StockTable AS StockTable ON Trs_Del2.StockID = StockTable.StockID LEFT OUTER JOIN

                      Mas_Grp AS Mas_Grp ON Mas_Dept.Grp = Mas_Grp.GrpNo LEFT OUTER JOIN

                      Mas_Buyer ON OrderMas.BuyerID = Mas_Buyer.BuyerID INNER JOIN

                      Mas_Dia AS Mas_Dia ON StockTable.DiaID = Mas_Dia.DiaID INNER JOIN

                      Mas_Dia AS Mas_Dia_2 ON StockTable.FinDiaID = Mas_Dia_2.DiaID

                      INNER JOIN

                      Mas_Fabric AS Mas_Fabric ON StockTable.FabID = Mas_Fabric.FabID LEFT OUTER JOIN

                      Mas_Design AS Mas_Design ON StockTable.PRINT_DESIGNID = Mas_Design.DesignId LEFT OUTER JOIN

                      Trs_Del3 ON StockTable.Gsm = Trs_Del3.Gsm AND StockTable.DiaID = Trs_Del3.DiaID AND StockTable.FinGsm = Trs_Del3.GeneralRate AND 

                      StockTable.FinDiaID = Trs_Del3.FinDiaID AND StockTable.PrgKnitGsm = Trs_Del3.PrgKnitGSM AND StockTable.PrgKnitDiaId = Trs_Del3.PrgKnitDiaId AND 

                      StockTable.PRINT_DESIGNID = Trs_Del3.Print_DesignId AND StockTable.ll = Trs_Del3.LL AND StockTable.GG = Trs_Del3.GG AND 

                      StockTable.FabID = Trs_Del3.FabType AND StockTable.LotNo = Trs_Del3.LotNo AND Trs_Del1.ID = Trs_Del3.ID AND Trs_Del2.OrdId = Trs_Del3.OrdId AND 

                      StockTable.CntID = Trs_Del3.Cnt AND StockTable.ColID = Trs_Del3.Clr LEFT OUTER JOIN

                      Pro_ReqKnitt2 ON Trs_Del2.OrdId = Pro_ReqKnitt2.OrdId AND Trs_Del1.Prs_Dept = Pro_ReqKnitt2.DeptId AND StockTable.Dept = Pro_ReqKnitt2.DeptId AND 

                      StockTable.CntID = Pro_ReqKnitt2.CntID AND StockTable.ColID = Pro_ReqKnitt2.ColId AND StockTable.FabID = Pro_ReqKnitt2.FabId AND 

                      StockTable.Gsm = Pro_ReqKnitt2.GSM AND StockTable.GG = Pro_ReqKnitt2.GG AND StockTable.ll = Pro_ReqKnitt2.LL AND 

                      StockTable.FinGsm = Pro_ReqKnitt2.FinGSM AND StockTable.FinDiaID = Pro_ReqKnitt2.FinDiaId AND StockTable.PrgKnitGsm = Pro_ReqKnitt2.GSM AND 

                      StockTable.PrgKnitDiaId = Pro_ReqKnitt2.DiaID AND StockTable.PRINT_DESIGNID = Pro_ReqKnitt2.DesignID 

					  					/*  LEFT OUTER JOIN

                      Pro_ReqKnitt2 Pro_ReqKnitt2_2 ON Trs_Del2.OrdId = Pro_ReqKnitt2_2.OrdId AND StockTable.Dept = Pro_ReqKnitt2_2.DeptId AND 

                      StockTable.CntID = Pro_ReqKnitt2_2.CntID AND StockTable.ColID = Pro_ReqKnitt2_2.ColId AND StockTable.FabID = Pro_ReqKnitt2_2.FabId AND 

                      StockTable.Gsm = Pro_ReqKnitt2_2.GSM AND StockTable.GG = Pro_ReqKnitt2_2.GG AND StockTable.ll = Pro_ReqKnitt2_2.LL AND 

                      StockTable.FinGsm = Pro_ReqKnitt2_2.FinGSM AND StockTable.FinDiaID = Pro_ReqKnitt2_2.FinDiaId AND StockTable.PrgKnitGsm = Pro_ReqKnitt2_2.GSM AND 

                      StockTable.PrgKnitDiaId = Pro_ReqKnitt2_2.DiaID AND StockTable.PRINT_DESIGNID = Pro_ReqKnitt2_2.DesignID */

LEFT OUTER JOIN

                      BudPodet INNER JOIN

                      BudPoMas ON BudPodet.Id = BudPoMas.Id ON StockTable.PRINT_DESIGNID = BudPodet.DesignID AND 

                      StockTable.PrgKnitDiaId = BudPodet.DiaId AND StockTable.PrgKnitGsm = BudPodet.GSM AND StockTable.FinDiaID = BudPodet.FinDiaId AND 

                      StockTable.FinGsm = BudPodet.FinGSM AND StockTable.ll = BudPodet.LL AND StockTable.GG = BudPodet.GG AND 

                      StockTable.ColID = BudPodet.ColId AND StockTable.CntID = BudPodet.CntId AND StockTable.FabID = BudPodet.FabId AND 

                      Trs_Del2.OrdId = BudPoMas.OrdId AND Trs_Del1.Prs_Dept = BudPoMas.DeptId AND Trs_Del1.Party = BudPoMas.PartyId LEFT OUTER JOIN

                      Mas_Vehicle ON Trs_Del1.VehicleCode = Mas_Vehicle.Code LEFT OUTER JOIN

                      Mas_Count AS Mas_Count ON StockTable.CntID = Mas_Count.CountID LEFT OUTER JOIN

                     Mas_design as Mas_design_1 on Trs_del1.DESIGNID = Mas_Design_1.DesignId left outer join

                      Mas_Color AS Mas_Color ON StockTable.ColID = Mas_Color.ColID LEFT OUTER JOIN

                      Mas_Uom AS Mas_Uom ON Mas_Fabric.PriUomID = Mas_Uom.UomID ON Mas_Terms.ID = Mas_Dept.DC_TermCode LEFT OUTER JOIN

                      Mas_Exporter AS Mas_Unit ON Trs_Del1.Party = Mas_Unit.ExpID LEFT OUTER JOIN

                      Mas_User ON Trs_Del1.PreparedBy = Mas_User.UserCode 

left outer join cutting_job on Trs_Del2.jobordid= cutting_job.id

left outer join Mas_exporter as cuttingunit on cutting_job.partyid=cuttingunit.expid  

LEFT OUTER JOIN Mas_Godown ON Trs_Del1.GodID = Mas_Godown.GodID

--Left Join Mas_HSN On Pro_ReqKnitt2_2.HSNId=Mas_HSN.Id

Left Join Mas_HSN On Pro_ReqKnitt2.HSNId=Mas_HSN.Id

CROSS JOIN

                      Options CROSS JOIN

                      PrePrint

WHERE     (PrePrint.Slno = 2) AND (Trs_Del1.ID =''' + @id + ''')'



EXEC sp_executesql @sql1 



END