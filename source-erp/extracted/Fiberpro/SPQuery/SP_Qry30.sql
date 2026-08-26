

/*;=============================================   

; Author           :  Global Software's    

; Create date      :  17/08/2022    

; Create By        :  ASLAM  

; Description      :  QUERY

; Change Person    :  ASLAM

; Last Change Date :  29/05/2024 03.35 PM 

; =============================================  */  



CREATE PROCEDURE SP_Qry30 (@tempStr as nvarchar(max),@tempStr_1 as nvarchar(max),@coycode nvarchar(max)) AS



BEGIN



DECLARE @sql1 nVarchar(Max) ;



SET @sql1 = '



SELECT  Accuom,ExporterName,Pid,DeptId,Deptname, Pname, OrdId, BuyOrdNo, SUM(RBag) AS RBag, SUM(RecKgs) AS RecKgs, SUM(Recmtr) AS Recmtr, RecMethod,  Proddept, docno,finyear,id,dt, LotNo,MultiGrn,0 as Colid,'''' as ColorDesc from ( SELECT ACCUOM.Uom
 as Accuom,Mas_Exporter.ExporterName,mas_party.Pid,Mas_Dept.DeptId,Mas_Dept.Deptname, Mas_Party.Pname, OrderMas.OrdId, OrderMas.BuyOrdNo, SUM(Trs_GRN2.RBag) AS RBag, SUM(Trs_GRN2.RecKgs) AS RecKgs, SUM(Trs_GRN2.Recmtr) AS Recmtr, Mas_dept.RecMethod,IsNUll
(Mas_dept.Proddept,''N'') Proddept,trs_del1.docno,trs_del1.finyear,trs_del1.id,trs_del1.dt,Case When IsNull(TRs_Del1.Lotno,'''')<>'''' Then IsNull(TRs_Del1.Lotno,'''') Else IsNull(StockTable.LotNo,'''') End As LotNo,StockTable.ColId, '''' As MultiGrn FROM
 Trs_Grn1 INNER JOIN Trs_Del1 ON Trs_Grn1.DcId=Trs_Del1.Id INNER JOIN Trs_GRN2 ON Trs_Grn1.ID = Trs_GRN2.ID INNER JOIN StockTable ON Trs_GRN2.StockID = StockTable.StockID INNER JOIN Mas_Exporter ON Trs_Grn1.Coycode = Mas_Exporter.ExpID INNER JOIN Mas_Dept
 ON Trs_Grn1.Dept 

= Mas_Dept.DeptID INNER JOIN Mas_Party ON Trs_Grn1.SuppID = Mas_Party.PID INNER JOIN OrderMas ON StockTable.OrdID = OrderMas.OrdId  left outer JOIN dbo.Mas_Fabric ON dbo.StockTable.FabID = dbo.Mas_Fabric.FabID left outer JOIN dbo.Mas_Uom ON dbo.Mas_Fabric.PriUomID = dbo.Mas_Uom.UomID LEFT OUTER JOIN  dbo.Mas_AccDes ON dbo.StockTable.Ades = dbo.Mas_AccDes.ID LEFT OUTER JOIN  dbo.Mas_Acc ON dbo.Mas_AccDes.AccTypeID = dbo.Mas_Acc.ID AND dbo.StockTable.Atype = dbo.Mas_Acc.ID LEFT OUTER JOIN  dbo.Mas_Size ON dbo.Mas_Size.SizeID = dbo.StockTable.Siz LEFT OUTER JOIN  dbo.Mas_Uom ACCUOM ON dbo.Mas_Acc.UomId = ACCUOM.UomID WHERE '

SET @sql1 = @sql1 + @tempStr + '  
and (Trs_Grn1.GRNType in (''Process'',''Acc.Proc.Receipt'')) and (ISNULL(Trs_DEl1.Clos,''No'')=''No'') AND  trs_grn1.coycode=''' + @coycode + ''' GROUP BY Mas_Exporter.ExporterName, Mas_Party.Pname, OrderMas.OrdId, Mas_Dept.DeptId,Mas_Dept.Deptname,OrderMas.BuyOrdNo ,mas_party.Pid,ACCUOM.Uom, Mas_dept.RecMethod,IsNUll(Mas_dept.Proddept,''N'') ,trs_del1.docno,trs_del1.finyear,trs_del1.id,trs_del1.dt,IsNull(TRs_Del1.Lotno,''''),IsNull(StockTable.Lotno,'''') ,StockTable.ColId
UNION  SELECT ACCUOM.Uom as Accuom,Mas_Exporter.ExporterName,mas_party.Pid,Mas_Dept.DeptId,Mas_Dept.Deptname, Mas_Party.Pname, OrderMas.OrdId, OrderMas.BuyOrdNo, SUM(Trs_GRN2.RBag) AS RBag, SUM(Trs_GRN2.RecKgs) AS RecKgs, SUM(Trs_GRN2.Recmtr) AS Recmtr, Mas_dept.RecMethod,IsNUll(Mas_dept.Proddept,''N'') Proddept,CASE WHEN ISNULL(OurDCID,'''')<> '''' THEN  Trs_Del1.DocNo ELSE  trs1.DocNo END AS DocNo, CASE WHEN ISNULL(OurDCID,'''')<> '''' THEN  Trs_Del1.Finyear ELSE  trs1.Finyear END AS Finyear,CASE WHEN ISNULL(OurDCID,'''')<> '''' THEN  Trs_Del1.ID ELSE  trs1.Id END AS ID, CASE WHEN ISNULL(OurDCID,'''')<> '''' THEN  Trs_Del1.Dt ELSE  trs1.GrnDate End as dt,Case When IsNull(TRs_Del1.Lotno,'''')<>'''' Then IsNull(TRs_Del1.Lotno,'''') Else IsNull(StockTable.LotNo,'''') End As LotNo,StockTable.ColId, CASE WHEN ISNULL(OurDCID,'''')<> '''' THEN '''' Else ''G'' End As MultiGrn FROM Trs_MultiPrs_Grn2 as Trs_GRN1 LEFT JOIN Trs_Del1 ON Trs_Grn1.OurDcId=Trs_Del1.Id INNER JOIN Trs_MultiPrs_Grn3 as Trs_GRN2 ON Trs_Grn1.ID = Trs_GRN2.ID AND Trs_Grn1.DeptID = Trs_GRN2.DeptID  INNER JOIN Trs_MultiPrs_Grn1 trs1 ON Trs_Grn1.Id = Trs1.id  INNER JOIN StockTable ON Trs_GRN2.StockID = StockTable.StockID INNER JOIN Mas_Exporter ON trs1.Coycode = Mas_Exporter.ExpID INNER JOIN Mas_Dept ON Trs_Grn2.DeptID = Mas_Dept.DeptID INNER JOIN Mas_Party ON Trs_Grn1.PartyID = Mas_Party.PID INNER JOIN OrderMas ON StockTable.OrdID = OrderMas.OrdId  left outer JOIN dbo.Mas_Fabric ON dbo.StockTable.FabID = dbo.Mas_Fabric.FabID left outer JOIN dbo.Mas_Uom ON dbo.Mas_Fabric.PriUomID = dbo.Mas_Uom.UomID 
LEFT OUTER JOIN  dbo.Mas_AccDes 
ON dbo.StockTable.Ades = dbo.Mas_AccDes.ID LEFT OUTER JOIN  dbo.Mas_Acc ON dbo.Mas_AccDes.AccTypeID = dbo.Mas_Acc.ID AND dbo.StockTable.Atype = dbo.Mas_Acc.ID LEFT OUTER JOIN  dbo.Mas_Size ON dbo.Mas_Size.SizeID = dbo.StockTable.Siz LEFT OUTER JOIN  dbo.Mas_Uom ACCUOM ON dbo.Mas_Acc.UomId = ACCUOM.UomID WHERE 

' 

SET @sql1 = @sql1 + @tempStr_1 + ' 



 and (Trs1.GRNType in (''Process'')) and (ISNULL(Trs_DEl1.Clos,''No'')=''No'') AND  trs1.coycode=''' + @coycode + '''  GROUP BY Mas_Exporter.ExporterName, Mas_Party.Pname, OrderMas.OrdId, Mas_Dept.DeptId,Mas_Dept.Deptname,OrderMas.BuyOrdNo ,mas_party.Pid,
ACCUOM.Uom, Mas_dept.RecMethod,IsNUll(Mas_dept.Proddept,''N'') , Trs_Del1.DocNo,trs1.DocNo , Trs_Del1.Finyear ,trs1.Finyear ,Trs_Del1.ID ,trs1.Id ,Trs_Del1.Dt ,trs1.GrnDate,IsNull(TRs_Del1.Lotno,''''),StockTable.ColId,ISNULL(OurDCID,''''),IsNull(StockTable.LotNo,''''))X LEFT JOIN Mas_Color ON X.ColId = Mas_Color.ColID GROUP BY  Accuom,ExporterName,Pid,DeptId,Deptname, Pname, OrdId, BuyOrdNo,  RecMethod,  Proddept, docno,finyear,id,dt, LotNo ,MultiGrn'



 print @Sql1



EXEC sp_executesql @sql1 



END

 