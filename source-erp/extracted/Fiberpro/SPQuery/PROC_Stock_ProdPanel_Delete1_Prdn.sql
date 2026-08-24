/*;=============================================   

; Author           :  Global Software's    

; Create date      :  17/08/2022    

; Create By        :  ASLAM  

; Description      :  PANEL_Stock  

; Change Person    :  ASLAM

; Last Change Date :  27/05/2023 10.00 AM 

; =============================================  */  
 

CREATE PROCEDURE PROC_Stock_ProdPanel_Delete1_Prdn (@Id int) AS  DECLARE @Coycode Int,@Ordid Int,@StyleNo Varchar(20),@StageId Int,@PartId Int,@GodId Int,@ColId Int,@StockQty Int,@SourceStageId Int,@FinalStage Char(1),@SeqNo int,@PartyId Int,@PcsStockId Int,@Rework Int,@RejectionTypeId Int ,@SqlCond as Varchar(100),@ProdPcs Int,@sizeId int ,@LOTID int,@LotNo varchar(100)  ,@CompID int

Select @Id=@Id  

Select @Coycode = CoyId From Trs_AddPanelEntry Where Id=@Id  

select @PartyId = 0    

SELECT @Ordid = OrdId From Trs_AddPanelEntry Where Id=@Id  

SELECT @StyleNo = StyleNo From Trs_AddPanelEntry Where Id=@Id  

SELECT @Stageid = StageId From Trs_AddPanelEntry Where Id=@Id  

SELECT @PartId = PartId From Trs_AddPanelEntry Where Id=@Id  

SELECT @GodId = GodId From Trs_AddPanelEntry Where Id=@Id    

SELECT @Rework = Rework From Trs_AddPanelEntry Where Id=@Id  

SELECT @RejectionTypeId = RejectionTypeId From Trs_AddPanelEntry Where Id=@Id    

Select @SeqNo = SeqNo From Trs_AddPanelEntry Inner Join Prod_Sequence On Trs_AddPanelEntry.OrdId=Prod_Sequence.OrdId And Trs_AddPanelEntry.StyleNo=Prod_Sequence.StyleNo And Trs_AddPanelEntry.StageId=Prod_Sequence.StageId Where Id=@Id   

SELECT @FinalStage = Mas_Dept.SemiFinish From Trs_AddPanelEntry Inner Join Mas_JobWrkComp On Trs_AddPanelEntry.StageId=Mas_JobWrkComp.Id Inner Join Mas_Dept On Mas_JobWrkComp.

DeptId=Mas_Dept.DeptId Where Trs_AddPanelEntry.Id=@Id   

SELECT @ColId = ClrId From Trs_AddPanelEntry Where Id=@Id  

Select @SourceStageId=SourceStageId From Trs_AddPanelEntry Where Id=@Id  

SELECT @StockQty = @ProdPcs   

SELECT @LotNo = IsNull(LotNo,'0') From Trs_AddPanelEntry Where id=@Id  

Select @CompId = CompId from Trs_AddPanelEntryQty_Component  where id = @Id 

if @LotNo<>'0'  

SELECT @LotID = IsNull(LotID,0) From Trs_AddPanelEntry Where Id=@Id  

else  

select @lotid=0  

begin  



SELECT A.Id,SizID,ProdPcs,d.CompId INTO #DTORDERDTL  FROM Trs_AddPanelEntry A INNER JOIN Trs_AddPanelEntryQty B ON a.ID = B.ID INNER JOIN Trs_AddPanelEntryQty_Det C ON A.Id = C.ID INNER JOIN Prod_CutComponents D ON A.Ordid = D.OrdId And A.StyleNo = D.StyleNo And A.Partid = D.PartId and C.JobOrdid = D.JobId WHERE  1 =2 



IF @StageId =1 



INSERT INTO #DTORDERDTL SELECT A.Id,SizID,ProdPcs,d.CompId FROM Trs_AddPanelEntry A INNER JOIN Trs_AddPanelEntryQty B ON a.ID = B.ID INNER JOIN Trs_AddPanelEntryQty_Det C ON A.Id = C.ID INNER JOIN Trs_AddPanelEntryQty_Component D ON A.ID= D.ID WHERE A.Id = @Id  And D.CompId = @CompId



ELSE

INSERT INTO #DTORDERDTL  Select A.Id,SizID,ProdPcs,d.CompId FROM Trs_AddPanelEntry A INNER JOIN Trs_AddPanelEntryQty B ON a.ID = B.ID INNER JOIN Trs_AddPanelEntryQty_Component C ON A.Id = C.ID INNER JOIN Trs_AddPanelEntryQty_Component D ON A.ID= D.ID WHERE A.Id = @Id And D.CompId = @CompId

print 'as1'
Select * from #DTORDERDTL 


DECLARE LINE_CURSOR CURSOR FOR 

/*Select A.Id,SizID,ProdPcs,d.CompId FROM Trs_AddPanelEntry A INNER JOIN Trs_AddPanelEntryQty B ON a.ID = B.ID INNER JOIN Trs_AddPanelEntryQty_Det C ON A.Id = C.ID INNER JOIN Prod_CutComponents D ON A.Ordid = D.OrdId And A.StyleNo = D.StyleNo And A.Partid
 = D.PartId and C.JobOrdid = D.JobId where a.ID  =@ID  */



SELECT ID,SizID,ProdPcs,CompID  FROM #DTORDERDTL 



OPEN LINE_CURSOR 

FETCH NEXT FROM LINE_CURSOR INTO @id,@Sizeid,@ProdPcs,@compID    

WHILE @@FETCH_STATUS = 0   

BEGIN   

 

 if @FinalStage='S' 

 Begin    

 UPDATE Panel_StockTableQty SET StockQty=Panel_StockTableQty.StockQty-@ProdPcs,ProductionQty=Panel_StockTableQty.ProductionQty-@ProdPcs From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId Inner Join Trs_AddPanelEntry On Panel_StockTable.Coycode=Trs_AddPanelEntry.CoyId And Panel_StockTable.OrdId=Trs_AddPanelEntry.OrdId And Panel_StockTable.StyleNo=Trs_AddPanelEntry.StyleNo And Panel_StockTable.StageId=Trs_AddPanelEntry.StageId And Panel_StockTable.PartId=Trs_AddPanelEntry.PartId And Panel_StockTable.GodId=Trs_AddPanelEntry.GodId And Panel_StockTableQty.ColId=Trs_AddPanelEntry.ClrId and IsNull(Panel_StockTableQty.GoodPcsFlag,'G')=

'G' and IsNull(Panel_StockTableQty.RejectionTypeId,0)=0 WHERE Panel_StockTable.coycode=Trs_AddPanelEntry.CoyId And Panel_StockTable.Ordid=Trs_AddPanelEntry.Ordid and Panel_StockTable.StyleNo=Trs_AddPanelEntry.StyleNo and Panel_StockTable.Stageid=Trs_AddPanelEntry.Stageid And Panel_StockTable.PartId=Trs_AddPanelEntry.PartId and Panel_StockTable.GodId=Trs_AddPanelEntry.GodId and Panel_StockTableQty.Colid=Trs_AddPanelEntry.ClrId and Panel_StockTableQty.SizeId=@SizeId

and Panel_StockTableQty.CompId=@CompId

 and IsNull(Panel_StockTableQty.GoodPcsFlag,'G')='G' and IsNull(Panel_StockTableQty.RejectionTypeId,0)=0 and Partyid=@Partyid And Trs_AddPanelEntry.Id=@Id  and Panel_StockTable.lotid=@LOTID 

End 

If @SourceStageid<>0 And @StageId<>1 And @FinalStage='S' And ((Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Piece' OR  (Select IsNull(PcsType,'Piece') From Mas_JobWrkComp Where Id=@StageId)='Panel')  Begin  

If EXISTS (

select * from Panel_StockTable where coycode=@coycode and Ordid=@Ordid and  StyleNo=@StyleNo and Stageid=@SourceStageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId)   

begin   

Select @PcsStockId=PcsStockId From Panel_StockTable where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and Stageid=@Stageid and PartId=@PartId and GodId=@GodId and PartyId=@PartyId      

If EXISTS (select * from Panel_StockTable Inner Join Panel_StockTableQty On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId where coycode=@coycode and Ordid=@Ordid and StyleNo=@StyleNo and Stageid=@SourceStageid and PartId=@PartId and GodId=@GodId and  PartyId=@PartyId and Panel_StockTableQty.ColId=@Colid and Panel_StockTableQty.SizeId=@SizeId and Panel_StockTableQty.CompId=@CompId and IsNull(Panel_StockTableQty.GoodPcsFlag,'G')=Case When IsNull(@Rework,0)=0 Then 'G' Else 'M' End and IsNull(Panel_StockTableQty.RejectionTypeId,0)=Case When IsNull(@Rework,0)=0 Then 0 Else @RejectionTypeId End)    

Begin   

UPDATE Panel_StockTableQty SET StockQty=Panel_StockTableQty.StockQty+@ProdPcs 

From Panel_StockTableQty Inner Join Panel_StockTable On Panel_StockTable.PcsStockId=Panel_StockTableQty.PcsStockId Inner Join Trs_AddPanelEntry On Panel_StockTable.Coycode=Trs_AddPanelEntry.CoyId And  Panel_StockTable.OrdId=Trs_AddPanelEntry.OrdId And Panel_StockTable.StyleNo=Trs_AddPanelEntry.StyleNo And Panel_StockTable.PartId=Trs_AddPanelEntry.PartId And Panel_StockTable.GodId=Trs_AddPanelEntry.GodId And Panel_StockTableQty.ColId=Trs_AddPanelEntry.ClrId and IsNull(Panel_StockTableQty.GoodPcsFlag,'G')=Case When IsNull(@Rework,0)=0 Then 'G' Else 'M' End

 and IsNull(Panel_StockTableQty.RejectionTypeId,0)=Case When IsNull(@Rework,0)=0 Then 0 Else @RejectionTypeId End And Panel_StockTableQty.SizeId=@SizeId 

 and Panel_StockTableQty.CompId=@CompId

 and IsNull(Panel_StockTableQty.GoodPcsFlag,'G')=Case When IsNull(@Rework,0)=0 Then 'G' Else 'M' End and IsNull(Panel_StockTableQty.RejectionTypeId,0)=Case When IsNull(@Rework,0)=0 Then 0 Else @RejectionTypeId End WHERE Panel_StockTable.coycode=Trs_AddPanelEntry.CoyId And Panel_StockTable.Ordid=Trs_AddPanelEntry.Ordid and Panel_StockTable.StyleNo=Trs_AddPanelEntry.StyleNo And Panel_StockTable.PartId=Trs_AddPanelEntry.PartId and Panel_StockTable.GodId=Trs_AddPanelEntry.GodId and  Panel_StockTableQty.Colid=
Trs_AddPanelEntry.ClrId and Panel_StockTableQty.SizeId=@SizeId 

 and Panel_StockTableQty.CompId=@CompId

 and IsNull(Panel_StockTableQty.GoodPcsFlag,'G')=Case When IsNull(@Rework,0)=0 Then 'G' Else 'M' End and IsNull(Panel_StockTableQty.RejectionTypeId,0)=Case When IsNull(@Rework,0) =0 Then 0 Else @RejectionTypeId End and Partyid=@Partyid And Panel_StockTable.StageId=@SourceStageId And Trs_AddPanelEntry.Id=@Id  and Panel_StockTable.lotid=@LOTID   

End  

Else  

Begin    

INSERT INTO Panel_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId,CompId) VALUES(@PcsStockId,@ColId,@Sizeid,@StockQty,Case When IsNull(@Rework,0)=0 Then 'G' Else 'M' End,Case When IsNull(@Rework,0)=0 Then 0 Else @RejectionTypeId End,@CompID)  

End  

End  

Else  

begin    

Select @PcsStockId=Max(IsNull(PcsStockId,0))+1 From Panel_StockTable   

INSERT INTO Panel_StockTable (Coycode,Ordid,styleNo,Stageid,PartId,SeqNo,GodId,PcsStockId,PartyId) VALUES (@Coycode,@Ordid,@StyleNo,@SourceStageid,@PartId,@SeqNo,@GodId,@PcsStockId,@PartyId)   

INSERT INTO Panel_StockTableQty (PcsStockId,colid,Sizeid,StockQty,GoodPcsFlag,RejectionTypeId,CompID) VALUES (@PcsStockId,@ColId,@Sizeid,@StockQty,Case When IsNull(@Rework,0)=0 Then 'G' Else 'M' End,Case When IsNull(@Rework,0)=0 Then 0 Else @RejectionTypeId End,@CompID)  

End    

End      

    

FETCH NEXT FROM LINE_CURSOR INTO @id,@Sizeid,@ProdPcs,@CompId   

END  

CLOSE LINE_CURSOR  DEALLOCATE LINE_CURSOR  SET NOCOUNT OFF   

End 
